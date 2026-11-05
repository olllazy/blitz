package httpapi

import (
	"strings"
	"testing"

	"blitz/internal/store"
)

func validQuiz() store.Quiz {
	return store.Quiz{
		Title: "  Тест  ",
		Questions: []store.Question{
			{Text: " 2 + 2? ", TimeLimit: 20, Options: []string{" 3 ", "4"}, Correct: 1},
		},
	}
}

func TestValidateQuizTrims(t *testing.T) {
	q := validQuiz()
	if err := validateQuiz(&q); err != nil {
		t.Fatal(err)
	}
	if q.Title != "Тест" || q.Questions[0].Text != "2 + 2?" || q.Questions[0].Options[0] != "3" {
		t.Fatalf("пробелы не обрезаны: %+v", q)
	}
}

func TestValidateQuizErrors(t *testing.T) {
	cases := map[string]func(q *store.Quiz){
		"пустое название":       func(q *store.Quiz) { q.Title = "   " },
		"нет вопросов":          func(q *store.Quiz) { q.Questions = nil },
		"один вариант":          func(q *store.Quiz) { q.Questions[0].Options = []string{"4"} },
		"пять вариантов":        func(q *store.Quiz) { q.Questions[0].Options = []string{"1", "2", "3", "4", "5"} },
		"пустой вариант":        func(q *store.Quiz) { q.Questions[0].Options[0] = " " },
		"правильный вне списка": func(q *store.Quiz) { q.Questions[0].Correct = 2 },
		"слишком мало времени":  func(q *store.Quiz) { q.Questions[0].TimeLimit = 1 },
		"длинный вопрос":        func(q *store.Quiz) { q.Questions[0].Text = strings.Repeat("а", 201) },
	}

	for name, mutate := range cases {
		t.Run(name, func(t *testing.T) {
			q := validQuiz()
			mutate(&q)
			if err := validateQuiz(&q); err == nil {
				t.Fatal("ожидали ошибку валидации")
			}
		})
	}
}
