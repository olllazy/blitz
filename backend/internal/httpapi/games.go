package httpapi

import (
	"errors"
	"net/http"
	"time"

	"blitz/internal/game"
	"blitz/internal/store"
)

func (h *Handler) createGame(w http.ResponseWriter, r *http.Request) {
	var in struct {
		QuizID int64 `json:"quizId"`
	}
	if !decode(w, r, &in) {
		return
	}

	userID := currentUser(r)
	quiz, err := h.store.GetQuiz(r.Context(), userID, in.QuizID)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "викторина не найдена")
		return
	}
	if err != nil {
		h.internalError(w, r, err)
		return
	}

	gq := game.Quiz{ID: quiz.ID, Title: quiz.Title}
	for _, q := range quiz.Questions {
		gq.Questions = append(gq.Questions, game.Question{
			Text:      q.Text,
			Options:   q.Options,
			Correct:   q.Correct,
			TimeLimit: time.Duration(q.TimeLimit) * time.Second,
		})
	}

	g, err := h.games.Create(userID, gq)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"pin": g.PIN})
}

func (h *Handler) gameInfo(w http.ResponseWriter, r *http.Request) {
	g := h.games.Get(r.PathValue("pin"))
	if g == nil {
		writeError(w, http.StatusNotFound, "игра с таким кодом не найдена")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"pin":   g.PIN,
		"title": g.Quiz.Title,
		"phase": g.Phase(),
	})
}

func (h *Handler) joinGame(w http.ResponseWriter, r *http.Request) {
	g := h.games.Get(r.PathValue("pin"))
	if g == nil {
		writeError(w, http.StatusNotFound, "игра с таким кодом не найдена")
		return
	}

	var in struct {
		Name string `json:"name"`
	}
	if !decode(w, r, &in) {
		return
	}

	p, err := g.Join(in.Name)
	switch {
	case errors.Is(err, game.ErrNameTaken):
		writeError(w, http.StatusConflict, err.Error())
		return
	case err != nil:
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{
		"playerId": p.ID,
		"name":     p.Name,
		"token":    p.Token(),
	})
}

func (h *Handler) gameHistory(w http.ResponseWriter, r *http.Request) {
	games, err := h.store.GameHistory(r.Context(), currentUser(r), 30)
	if err != nil {
		h.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, games)
}
