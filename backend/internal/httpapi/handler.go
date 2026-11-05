package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"blitz/internal/auth"
	"blitz/internal/game"
	"blitz/internal/store"
)

const cookieName = "blitz_token"

type Config struct {
	CookieSecure   bool
	AllowedOrigins []string
}

type Handler struct {
	store  *store.Store
	games  *game.Manager
	tokens *auth.Tokens
	cfg    Config
	log    *slog.Logger
}

func New(st *store.Store, games *game.Manager, tokens *auth.Tokens, cfg Config, log *slog.Logger) *Handler {
	return &Handler{store: st, games: games, tokens: tokens, cfg: cfg, log: log}
}

func (h *Handler) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	mux.HandleFunc("POST /api/auth/register", h.register)
	mux.HandleFunc("POST /api/auth/login", h.login)
	mux.HandleFunc("POST /api/auth/logout", h.logout)

	mux.HandleFunc("GET /api/games/{pin}", h.gameInfo)
	mux.HandleFunc("POST /api/games/{pin}/join", h.joinGame)

	// дальше только для вошедших
	auth := h.requireUser
	mux.Handle("GET /api/auth/me", auth(h.me))

	mux.Handle("GET /api/quizzes", auth(h.listQuizzes))
	mux.Handle("POST /api/quizzes", auth(h.createQuiz))
	mux.Handle("GET /api/quizzes/{id}", auth(h.getQuiz))
	mux.Handle("PUT /api/quizzes/{id}", auth(h.updateQuiz))
	mux.Handle("DELETE /api/quizzes/{id}", auth(h.deleteQuiz))

	mux.Handle("POST /api/games", auth(h.createGame))
	mux.Handle("GET /api/games/history", auth(h.gameHistory))

	mux.HandleFunc("GET /ws/host/{pin}", h.hostSocket)
	mux.HandleFunc("GET /ws/play/{pin}", h.playerSocket)

	return h.logRequests(h.recoverPanics(mux))
}

type ctxKey struct{}

func (h *Handler) requireUser(next http.HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id, ok := h.userID(r)
		if !ok {
			writeError(w, http.StatusUnauthorized, "нужно войти в аккаунт")
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, id)))
	})
}

func (h *Handler) userID(r *http.Request) (int64, bool) {
	cookie, err := r.Cookie(cookieName)
	if err != nil {
		return 0, false
	}
	id, err := h.tokens.Parse(cookie.Value)
	return id, err == nil
}

func currentUser(r *http.Request) int64 {
	id, _ := r.Context().Value(ctxKey{}).(int64)
	return id
}

func (h *Handler) setSession(w http.ResponseWriter, userID int64) error {
	token, err := h.tokens.Issue(userID)
	if err != nil {
		return err
	}
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   int(h.tokens.TTL() / time.Second),
		HttpOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
	return nil
}

func (h *Handler) clearSession(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func (h *Handler) internalError(w http.ResponseWriter, r *http.Request, err error) {
	h.log.Error("request failed", "path", r.URL.Path, "err", err)
	writeError(w, http.StatusInternalServerError, "что-то пошло не так, попробуйте ещё раз")
}

func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	if !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
		writeError(w, http.StatusUnsupportedMediaType, "ожидается json")
		return false
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeError(w, http.StatusRequestEntityTooLarge, "слишком большой запрос")
		} else {
			writeError(w, http.StatusBadRequest, "некорректный json")
		}
		return false
	}
	return true
}
