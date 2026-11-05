package httpapi

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"blitz/internal/store"
)

func validateQuiz(q *store.Quiz) error {
	q.Title = strings.TrimSpace(q.Title)
	q.Description = strings.TrimSpace(q.Description)

	if n := utf8.RuneCountInString(q.Title); n == 0 || n > 80 {
		return errors.New("название должно быть от 1 до 80 символов")
	}
	if utf8.RuneCountInString(q.Description) > 300 {
		return errors.New("описание не длиннее 300 символов")
	}
	if len(q.Questions) == 0 || len(q.Questions) > 50 {
		return errors.New("в викторине должно быть от 1 до 50 вопросов")
	}

	for i := range q.Questions {
		qs := &q.Questions[i]
		num := i + 1
		qs.Text = strings.TrimSpace(qs.Text)

		if n := utf8.RuneCountInString(qs.Text); n == 0 || n > 200 {
			return fmt.Errorf("вопрос %d: текст от 1 до 200 символов", num)
		}
		if qs.TimeLimit < 5 || qs.TimeLimit > 120 {
			return fmt.Errorf("вопрос %d: время от 5 до 120 секунд", num)
		}
		if len(qs.Options) < 2 || len(qs.Options) > 4 {
			return fmt.Errorf("вопрос %d: нужно от 2 до 4 вариантов", num)
		}
		for j := range qs.Options {
			qs.Options[j] = strings.TrimSpace(qs.Options[j])
			if n := utf8.RuneCountInString(qs.Options[j]); n == 0 || n > 80 {
				return fmt.Errorf("вопрос %d: вариант ответа от 1 до 80 символов", num)
			}
		}
		if qs.Correct < 0 || qs.Correct >= len(qs.Options) {
			return fmt.Errorf("вопрос %d: отметьте правильный ответ", num)
		}
	}
	return nil
}

func quizID(r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	return id, err == nil && id > 0
}

func (h *Handler) listQuizzes(w http.ResponseWriter, r *http.Request) {
	quizzes, err := h.store.ListQuizzes(r.Context(), currentUser(r))
	if err != nil {
		h.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, quizzes)
}

func (h *Handler) getQuiz(w http.ResponseWriter, r *http.Request) {
	id, ok := quizID(r)
	if !ok {
		writeError(w, http.StatusNotFound, "викторина не найдена")
		return
	}

	quiz, err := h.store.GetQuiz(r.Context(), currentUser(r), id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "викторина не найдена")
		return
	}
	if err != nil {
		h.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, quiz)
}

func (h *Handler) createQuiz(w http.ResponseWriter, r *http.Request) {
	h.saveQuiz(w, r, 0)
}

func (h *Handler) updateQuiz(w http.ResponseWriter, r *http.Request) {
	id, ok := quizID(r)
	if !ok {
		writeError(w, http.StatusNotFound, "викторина не найдена")
		return
	}
	h.saveQuiz(w, r, id)
}

func (h *Handler) saveQuiz(w http.ResponseWriter, r *http.Request, id int64) {
	var in store.Quiz
	if !decode(w, r, &in) {
		return
	}
	if err := validateQuiz(&in); err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	in.ID = id

	saved, err := h.store.SaveQuiz(r.Context(), currentUser(r), in)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "викторина не найдена")
		return
	}
	if err != nil {
		h.internalError(w, r, err)
		return
	}

	quiz, err := h.store.GetQuiz(r.Context(), currentUser(r), saved)
	if err != nil {
		h.internalError(w, r, err)
		return
	}
	status := http.StatusOK
	if id == 0 {
		status = http.StatusCreated
	}
	writeJSON(w, status, quiz)
}

func (h *Handler) deleteQuiz(w http.ResponseWriter, r *http.Request) {
	id, ok := quizID(r)
	if !ok {
		writeError(w, http.StatusNotFound, "викторина не найдена")
		return
	}

	err := h.store.DeleteQuiz(r.Context(), currentUser(r), id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "викторина не найдена")
		return
	}
	if err != nil {
		h.internalError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
