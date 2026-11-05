package httpapi

import (
	"errors"
	"net/http"
	"net/mail"
	"strings"
	"unicode/utf8"

	"blitz/internal/auth"
	"blitz/internal/store"
)

type credentials struct {
	Email    string `json:"email"`
	Name     string `json:"name"`
	Password string `json:"password"`
}

func (c *credentials) normalize() {
	c.Email = strings.ToLower(strings.TrimSpace(c.Email))
	c.Name = strings.TrimSpace(c.Name)
}

func (h *Handler) register(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if !decode(w, r, &in) {
		return
	}
	in.normalize()

	if _, err := mail.ParseAddress(in.Email); err != nil || len(in.Email) > 254 {
		writeError(w, http.StatusUnprocessableEntity, "проверьте email")
		return
	}
	if n := utf8.RuneCountInString(in.Name); n < 2 || n > 40 {
		writeError(w, http.StatusUnprocessableEntity, "имя должно быть от 2 до 40 символов")
		return
	}
	// у bcrypt ограничение в 72 байта
	if len(in.Password) < 8 || len(in.Password) > 72 {
		writeError(w, http.StatusUnprocessableEntity, "пароль должен быть от 8 до 72 символов")
		return
	}

	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		h.internalError(w, r, err)
		return
	}
	user, err := h.store.CreateUser(r.Context(), in.Email, in.Name, hash)
	if errors.Is(err, store.ErrEmailTaken) {
		writeError(w, http.StatusConflict, "такой email уже зарегистрирован")
		return
	}
	if err != nil {
		h.internalError(w, r, err)
		return
	}

	if err := h.setSession(w, user.ID); err != nil {
		h.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, user)
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if !decode(w, r, &in) {
		return
	}
	in.normalize()

	user, err := h.store.UserByEmail(r.Context(), in.Email)
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		h.internalError(w, r, err)
		return
	}
	if err != nil || !auth.CheckPassword(user.PasswordHash, in.Password) {
		writeError(w, http.StatusUnauthorized, "неверный email или пароль")
		return
	}

	if err := h.setSession(w, user.ID); err != nil {
		h.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (h *Handler) logout(w http.ResponseWriter, _ *http.Request) {
	h.clearSession(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	user, err := h.store.UserByID(r.Context(), currentUser(r))
	if errors.Is(err, store.ErrNotFound) {
		h.clearSession(w)
		writeError(w, http.StatusUnauthorized, "нужно войти в аккаунт")
		return
	}
	if err != nil {
		h.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, user)
}
