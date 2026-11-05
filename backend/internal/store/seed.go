package store

import (
	"context"
	"errors"
)

const (
	DemoEmail    = "demo@blitz.dev"
	DemoPassword = "demo1234"
)

var demoQuizzes = []Quiz{
	{
		Title:       "Фронтенд за пять минут",
		Description: "Разминка для тех, кто пишет на React каждый день",
		Questions: []Question{
			{Text: "Какой хук используют для побочных эффектов?", TimeLimit: 20,
				Options: []string{"useMemo", "useEffect", "useRef", "useId"}, Correct: 1},
			{Text: "Что вернёт typeof null?", TimeLimit: 15,
				Options: []string{"\"null\"", "\"undefined\"", "\"object\""}, Correct: 2},
			{Text: "Какой HTTP-статус означает «не авторизован»?", TimeLimit: 15,
				Options: []string{"401", "403", "404", "418"}, Correct: 0},
			{Text: "Какое свойство CSS включает grid-раскладку?", TimeLimit: 20,
				Options: []string{"position: grid", "display: grid", "layout: grid", "flex: grid"}, Correct: 1},
			{Text: "WebSocket работает поверх…", TimeLimit: 20,
				Options: []string{"UDP", "TCP", "SMTP", "FTP"}, Correct: 1},
		},
	},
	{
		Title:       "Вокруг света",
		Description: "Столицы, реки и немного неожиданных фактов",
		Questions: []Question{
			{Text: "Столица Австралии?", TimeLimit: 15,
				Options: []string{"Сидней", "Мельбурн", "Канберра", "Перт"}, Correct: 2},
			{Text: "Самая длинная река Европы?", TimeLimit: 20,
				Options: []string{"Дунай", "Волга", "Рейн", "Днепр"}, Correct: 1},
			{Text: "В какой стране больше всего озёр?", TimeLimit: 20,
				Options: []string{"Финляндия", "Россия", "Канада", "Швеция"}, Correct: 2},
			{Text: "Сколько часовых поясов в России?", TimeLimit: 15,
				Options: []string{"9", "11", "12"}, Correct: 1},
		},
	},
}

// демо-аккаунт для просмотра без регистрации; пароль каждый раз сбрасывается на demo1234
func (s *Store) SeedDemo(ctx context.Context, passwordHash string) error {
	_, err := s.UserByEmail(ctx, DemoEmail)
	if err == nil {
		_, err = s.db.Exec(ctx, `update users set password_hash = $1 where email = $2`, passwordHash, DemoEmail)
		return err
	}
	if !errors.Is(err, ErrNotFound) {
		return err
	}

	u, err := s.CreateUser(ctx, DemoEmail, "Демо", passwordHash)
	if err != nil {
		return err
	}
	for _, q := range demoQuizzes {
		if _, err := s.SaveQuiz(ctx, u.ID, q); err != nil {
			return err
		}
	}
	return nil
}
