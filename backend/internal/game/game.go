package game

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

type Phase string

const (
	PhaseLobby    Phase = "lobby"
	PhaseQuestion Phase = "question"
	PhaseReveal   Phase = "reveal"
	PhaseFinished Phase = "finished"
)

const (
	MaxPlayers = 50
	MaxNameLen = 20
)

var (
	ErrBadName       = errors.New("имя должно быть от 1 до 20 символов")
	ErrNameTaken     = errors.New("это имя уже занято")
	ErrGameStarted   = errors.New("игра уже началась")
	ErrGameFull      = errors.New("в игре больше нет мест")
	ErrNoPlayers     = errors.New("подождите хотя бы одного игрока")
	ErrWrongPhase    = errors.New("сейчас это действие недоступно")
	ErrAlreadyAnswer = errors.New("ответ уже принят")
	ErrBadOption     = errors.New("такого варианта нет")
	ErrTimeUp        = errors.New("время вышло")
	ErrUnknownCmd    = errors.New("неизвестная команда")
)

type Question struct {
	Text      string
	Options   []string
	Correct   int
	TimeLimit time.Duration
}

type Quiz struct {
	ID        int64
	Title     string
	Questions []Question
}

type Player struct {
	ID    string
	Name  string
	token string

	score   int
	correct int
	streak  int

	answer      int // -1 пока не ответил
	answeredIn  time.Duration
	lastGain    int
	lastCorrect bool

	client *Client
}

func (p *Player) Token() string { return p.token }

type Game struct {
	PIN    string
	HostID int64
	Quiz   Quiz

	// mu защищает все поля ниже и поля игроков и клиентов;
	// таймер срабатывает в отдельной горутине и тоже берёт mu
	mu         sync.Mutex
	now        func() time.Time
	onFinish   func(Result)
	phase      Phase
	index      int
	createdAt  time.Time
	startedAt  time.Time
	finishedAt time.Time
	qStarted   time.Time
	timer      *time.Timer
	players    []*Player
	host       *Client
}

func newGame(pin string, hostID int64, quiz Quiz, onFinish func(Result)) *Game {
	return &Game{
		PIN:       pin,
		HostID:    hostID,
		Quiz:      quiz,
		now:       time.Now,
		onFinish:  onFinish,
		phase:     PhaseLobby,
		createdAt: time.Now(),
	}
}

func (g *Game) Phase() Phase {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.phase
}

func (g *Game) Join(name string) (*Player, error) {
	name = strings.Join(strings.Fields(name), " ")
	if n := utf8.RuneCountInString(name); n == 0 || n > MaxNameLen {
		return nil, ErrBadName
	}

	g.mu.Lock()
	defer g.mu.Unlock()

	if g.phase != PhaseLobby {
		return nil, ErrGameStarted
	}
	if len(g.players) >= MaxPlayers {
		return nil, ErrGameFull
	}
	for _, p := range g.players {
		if strings.EqualFold(p.Name, name) {
			return nil, ErrNameTaken
		}
	}

	p := &Player{ID: randomHex(4), Name: name, token: randomHex(16), answer: -1}
	g.players = append(g.players, p)
	g.broadcast()
	return p, nil
}

func (g *Game) AttachHost(c *Client) {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.host != nil {
		g.drop(g.host, ReasonReplaced)
	}
	g.host = c
	g.push(c, g.hostView())
}

func (g *Game) AttachPlayer(token string, c *Client) (*Player, bool) {
	g.mu.Lock()
	defer g.mu.Unlock()

	p := g.playerByToken(token)
	if p == nil {
		return nil, false
	}
	if p.client != nil {
		g.drop(p.client, ReasonReplaced)
	}
	p.client = c
	g.broadcast()
	return p, true
}

func (g *Game) Detach(c *Client) {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.host == c {
		g.host = nil
		g.drop(c, ReasonClosed)
		return
	}
	for _, p := range g.players {
		if p.client == c {
			p.client = nil
			g.drop(c, ReasonClosed)
			g.broadcast()
			return
		}
	}
}

func (g *Game) Close() {
	g.mu.Lock()
	defer g.mu.Unlock()

	g.stopTimer()
	if g.host != nil {
		g.drop(g.host, ReasonClosed)
		g.host = nil
	}
	for _, p := range g.players {
		if p.client != nil {
			g.drop(p.client, ReasonClosed)
			p.client = nil
		}
	}
}

func (g *Game) HandleHost(c *Client, data []byte) {
	var cmd command
	if err := json.Unmarshal(data, &cmd); err != nil {
		g.sendError(c, ErrUnknownCmd)
		return
	}

	var err error
	switch cmd.Type {
	case "start":
		err = g.Start()
	case "skip":
		err = g.Skip()
	case "next":
		err = g.Next()
	default:
		err = ErrUnknownCmd
	}
	if err != nil {
		g.sendError(c, err)
	}
}

func (g *Game) HandlePlayer(p *Player, c *Client, data []byte) {
	var cmd command
	if err := json.Unmarshal(data, &cmd); err != nil || cmd.Type != "answer" {
		g.sendError(c, ErrUnknownCmd)
		return
	}
	if err := g.Answer(p.ID, cmd.Option); err != nil {
		g.sendError(c, err)
	}
}

func (g *Game) Start() error {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.phase != PhaseLobby {
		return ErrWrongPhase
	}
	if len(g.players) == 0 {
		return ErrNoPlayers
	}
	g.startedAt = g.now()
	g.startQuestion(0)
	return nil
}

func (g *Game) Skip() error {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.phase != PhaseQuestion {
		return ErrWrongPhase
	}
	g.reveal()
	return nil
}

func (g *Game) Next() error {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.phase != PhaseReveal {
		return ErrWrongPhase
	}
	if g.index+1 < len(g.Quiz.Questions) {
		g.startQuestion(g.index + 1)
	} else {
		g.finish()
	}
	return nil
}

func (g *Game) Answer(playerID string, option int) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.phase != PhaseQuestion {
		return ErrTimeUp
	}
	p := g.playerByID(playerID)
	if p == nil {
		return ErrWrongPhase
	}
	if p.answer >= 0 {
		return ErrAlreadyAnswer
	}

	q := g.Quiz.Questions[g.index]
	if option < 0 || option >= len(q.Options) {
		return ErrBadOption
	}
	elapsed := g.now().Sub(g.qStarted)
	if elapsed > q.TimeLimit {
		return ErrTimeUp
	}

	p.answer = option
	p.answeredIn = elapsed

	if g.everyoneAnswered() {
		g.reveal()
	} else {
		g.broadcast()
	}
	return nil
}

func (g *Game) startQuestion(i int) {
	q := g.Quiz.Questions[i]
	g.phase = PhaseQuestion
	g.index = i
	g.qStarted = g.now()

	for _, p := range g.players {
		p.answer = -1
		p.answeredIn = 0
		p.lastGain = 0
		p.lastCorrect = false
	}

	g.stopTimer()
	g.timer = time.AfterFunc(q.TimeLimit, func() {
		g.mu.Lock()
		defer g.mu.Unlock()
		if g.phase == PhaseQuestion && g.index == i {
			g.reveal()
		}
	})

	g.broadcast()
}

func (g *Game) reveal() {
	g.stopTimer()
	q := g.Quiz.Questions[g.index]

	for _, p := range g.players {
		if p.answer == q.Correct {
			p.streak++
			p.lastGain = Points(p.answeredIn, q.TimeLimit, p.streak)
			p.lastCorrect = true
			p.score += p.lastGain
			p.correct++
		} else {
			p.streak = 0
		}
	}

	g.phase = PhaseReveal
	g.broadcast()
}

func (g *Game) finish() {
	g.phase = PhaseFinished
	g.finishedAt = g.now()
	g.broadcast()

	if g.onFinish != nil {
		go g.onFinish(g.result())
	}
}

// офлайн-игроков не ждём, их догонит таймер
func (g *Game) everyoneAnswered() bool {
	waiting := 0
	for _, p := range g.players {
		if p.client != nil {
			waiting++
			if p.answer < 0 {
				return false
			}
		}
	}
	return waiting > 0
}

func (g *Game) stopTimer() {
	if g.timer != nil {
		g.timer.Stop()
		g.timer = nil
	}
}

func (g *Game) expired(now time.Time) bool {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.phase == PhaseFinished {
		return now.Sub(g.finishedAt) > 30*time.Minute
	}
	return now.Sub(g.createdAt) > 4*time.Hour
}

func (g *Game) playerByToken(token string) *Player {
	if token == "" {
		return nil
	}
	for _, p := range g.players {
		if p.token == token {
			return p
		}
	}
	return nil
}

func (g *Game) playerByID(id string) *Player {
	for _, p := range g.players {
		if p.ID == id {
			return p
		}
	}
	return nil
}

// игроки по очкам, при равенстве - по порядку подключения
func (g *Game) ranking() []*Player {
	sorted := make([]*Player, len(g.players))
	copy(sorted, g.players)
	sort.SliceStable(sorted, func(i, j int) bool {
		return sorted[i].score > sorted[j].score
	})
	return sorted
}

func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
