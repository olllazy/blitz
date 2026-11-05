package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

type Quiz struct {
	ID            int64      `json:"id"`
	Title         string     `json:"title"`
	Description   string     `json:"description"`
	QuestionCount int        `json:"questionCount"`
	UpdatedAt     time.Time  `json:"updatedAt"`
	Questions     []Question `json:"questions,omitempty"`
}

type Question struct {
	Text      string   `json:"text"`
	TimeLimit int      `json:"timeLimit"`
	Options   []string `json:"options"`
	Correct   int      `json:"correct"`
}

func (s *Store) ListQuizzes(ctx context.Context, ownerID int64) ([]Quiz, error) {
	rows, err := s.db.Query(ctx,
		`select q.id, q.title, q.description, q.updated_at, count(qs.id)
		 from quizzes q
		 left join questions qs on qs.quiz_id = q.id
		 where q.owner_id = $1
		 group by q.id
		 order by q.updated_at desc`, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	quizzes := []Quiz{}
	for rows.Next() {
		var q Quiz
		if err := rows.Scan(&q.ID, &q.Title, &q.Description, &q.UpdatedAt, &q.QuestionCount); err != nil {
			return nil, err
		}
		quizzes = append(quizzes, q)
	}
	return quizzes, rows.Err()
}

func (s *Store) GetQuiz(ctx context.Context, ownerID, id int64) (Quiz, error) {
	var q Quiz
	err := s.db.QueryRow(ctx,
		`select id, title, description, updated_at from quizzes where id = $1 and owner_id = $2`,
		id, ownerID,
	).Scan(&q.ID, &q.Title, &q.Description, &q.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Quiz{}, ErrNotFound
	}
	if err != nil {
		return Quiz{}, err
	}

	rows, err := s.db.Query(ctx,
		`select qs.position, qs.text, qs.time_limit, qs.correct_option, o.text
		 from questions qs
		 join question_options o on o.question_id = qs.id
		 where qs.quiz_id = $1
		 order by qs.position, o.position`, id)
	if err != nil {
		return Quiz{}, err
	}
	defer rows.Close()

	q.Questions = []Question{}
	last := -1
	for rows.Next() {
		var (
			pos    int
			qs     Question
			option string
		)
		if err := rows.Scan(&pos, &qs.Text, &qs.TimeLimit, &qs.Correct, &option); err != nil {
			return Quiz{}, err
		}
		if pos != last {
			q.Questions = append(q.Questions, qs)
			last = pos
		}
		cur := &q.Questions[len(q.Questions)-1]
		cur.Options = append(cur.Options, option)
	}
	q.QuestionCount = len(q.Questions)
	return q, rows.Err()
}

// id == 0 - создать новую, иначе перезаписать существующую целиком
func (s *Store) SaveQuiz(ctx context.Context, ownerID int64, q Quiz) (int64, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	id := q.ID
	if id == 0 {
		err = tx.QueryRow(ctx,
			`insert into quizzes (owner_id, title, description) values ($1, $2, $3) returning id`,
			ownerID, q.Title, q.Description,
		).Scan(&id)
		if err != nil {
			return 0, err
		}
	} else {
		tag, err := tx.Exec(ctx,
			`update quizzes set title = $1, description = $2, updated_at = now()
			 where id = $3 and owner_id = $4`,
			q.Title, q.Description, id, ownerID)
		if err != nil {
			return 0, err
		}
		if tag.RowsAffected() == 0 {
			return 0, ErrNotFound
		}
		if _, err := tx.Exec(ctx, `delete from questions where quiz_id = $1`, id); err != nil {
			return 0, err
		}
	}

	for i, qs := range q.Questions {
		var questionID int64
		err := tx.QueryRow(ctx,
			`insert into questions (quiz_id, position, text, time_limit, correct_option)
			 values ($1, $2, $3, $4, $5) returning id`,
			id, i, qs.Text, qs.TimeLimit, qs.Correct,
		).Scan(&questionID)
		if err != nil {
			return 0, err
		}
		for j, opt := range qs.Options {
			_, err := tx.Exec(ctx,
				`insert into question_options (question_id, position, text) values ($1, $2, $3)`,
				questionID, j, opt)
			if err != nil {
				return 0, err
			}
		}
	}

	return id, tx.Commit(ctx)
}

func (s *Store) DeleteQuiz(ctx context.Context, ownerID, id int64) error {
	tag, err := s.db.Exec(ctx, `delete from quizzes where id = $1 and owner_id = $2`, id, ownerID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
