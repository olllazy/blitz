package store

import (
	"context"
	"time"

	"blitz/internal/game"
)

type GameSummary struct {
	ID         int64          `json:"id"`
	QuizTitle  string         `json:"quizTitle"`
	PIN        string         `json:"pin"`
	StartedAt  time.Time      `json:"startedAt"`
	FinishedAt time.Time      `json:"finishedAt"`
	Players    []PlayerResult `json:"players"`
}

type PlayerResult struct {
	Name    string `json:"name"`
	Score   int    `json:"score"`
	Correct int    `json:"correct"`
	Place   int    `json:"place"`
}

func (s *Store) SaveGame(ctx context.Context, r game.Result) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// викторину могли удалить, пока шла игра
	var quizID *int64
	if r.QuizID != 0 {
		err := tx.QueryRow(ctx, `select id from quizzes where id = $1`, r.QuizID).Scan(&quizID)
		if err != nil {
			quizID = nil
		}
	}

	var id int64
	err = tx.QueryRow(ctx,
		`insert into games (quiz_id, host_id, quiz_title, pin, started_at, finished_at)
		 values ($1, $2, $3, $4, $5, $6) returning id`,
		quizID, r.HostID, r.QuizTitle, r.PIN, r.StartedAt, r.FinishedAt,
	).Scan(&id)
	if err != nil {
		return err
	}

	for _, p := range r.Players {
		_, err := tx.Exec(ctx,
			`insert into game_players (game_id, name, score, correct, place) values ($1, $2, $3, $4, $5)`,
			id, p.Name, p.Score, p.Correct, p.Place)
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (s *Store) GameHistory(ctx context.Context, hostID int64, limit int) ([]GameSummary, error) {
	rows, err := s.db.Query(ctx,
		`select id, quiz_title, pin, started_at, finished_at
		 from games where host_id = $1
		 order by finished_at desc limit $2`, hostID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	games := []GameSummary{}
	index := map[int64]int{}
	ids := []int64{}
	for rows.Next() {
		var g GameSummary
		if err := rows.Scan(&g.ID, &g.QuizTitle, &g.PIN, &g.StartedAt, &g.FinishedAt); err != nil {
			return nil, err
		}
		g.Players = []PlayerResult{}
		index[g.ID] = len(games)
		ids = append(ids, g.ID)
		games = append(games, g)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(ids) == 0 {
		return games, nil
	}

	prow, err := s.db.Query(ctx,
		`select game_id, name, score, correct, place from game_players
		 where game_id = any($1) order by game_id, place`, ids)
	if err != nil {
		return nil, err
	}
	defer prow.Close()

	for prow.Next() {
		var (
			gameID int64
			p      PlayerResult
		)
		if err := prow.Scan(&gameID, &p.Name, &p.Score, &p.Correct, &p.Place); err != nil {
			return nil, err
		}
		g := &games[index[gameID]]
		g.Players = append(g.Players, p)
	}
	return games, prow.Err()
}
