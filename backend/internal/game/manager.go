package game

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"sync"
	"time"
)

type Result struct {
	QuizID     int64
	HostID     int64
	QuizTitle  string
	PIN        string
	StartedAt  time.Time
	FinishedAt time.Time
	Players    []ResultRow
}

type ResultRow struct {
	Name    string
	Score   int
	Correct int
	Place   int
}

func (g *Game) result() Result {
	r := Result{
		QuizID:     g.Quiz.ID,
		HostID:     g.HostID,
		QuizTitle:  g.Quiz.Title,
		PIN:        g.PIN,
		StartedAt:  g.startedAt,
		FinishedAt: g.finishedAt,
	}
	for i, p := range g.ranking() {
		r.Players = append(r.Players, ResultRow{Name: p.Name, Score: p.score, Correct: p.correct, Place: i + 1})
	}
	return r
}

// активные игры живут в памяти - для пет-проекта одного инстанса достаточно
type Manager struct {
	mu       sync.Mutex
	games    map[string]*Game
	onFinish func(Result)
}

func NewManager(onFinish func(Result)) *Manager {
	return &Manager{games: map[string]*Game{}, onFinish: onFinish}
}

func (m *Manager) Create(hostID int64, quiz Quiz) (*Game, error) {
	if len(quiz.Questions) == 0 {
		return nil, errors.New("в викторине нет вопросов")
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	for range 20 {
		pin, err := randomPIN()
		if err != nil {
			return nil, err
		}
		if _, busy := m.games[pin]; busy {
			continue
		}
		g := newGame(pin, hostID, quiz, m.onFinish)
		m.games[pin] = g
		return g, nil
	}
	return nil, errors.New("не удалось подобрать код игры")
}

func (m *Manager) Get(pin string) *Game {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.games[pin]
}

func (m *Manager) Run(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case now := <-ticker.C:
			m.cleanup(now)
		}
	}
}

func (m *Manager) cleanup(now time.Time) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for pin, g := range m.games {
		if g.expired(now) {
			g.Close()
			delete(m.games, pin)
		}
	}
}

func randomPIN() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(900000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()+100000), nil
}
