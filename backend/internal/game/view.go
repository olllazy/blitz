package game

import "time"

type PlayerInfo struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Score    int    `json:"score"`
	Online   bool   `json:"online"`
	Answered bool   `json:"answered"`
}

type QuestionView struct {
	Index     int      `json:"index"`
	Total     int      `json:"total"`
	Text      string   `json:"text"`
	Options   []string `json:"options"`
	TimeLimit int      `json:"timeLimit"`
	EndsAt    int64    `json:"endsAt"`
}

type RevealView struct {
	Correct int   `json:"correct"`
	Counts  []int `json:"counts"`
}

type MeView struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Score       int    `json:"score"`
	Place       int    `json:"place"`
	Answer      int    `json:"answer"`
	LastGain    int    `json:"lastGain"`
	LastCorrect bool   `json:"lastCorrect"`
	Streak      int    `json:"streak"`
}

// снимок состояния, который сервер отправляет клиенту после каждого изменения
type View struct {
	Role       string        `json:"role"`
	Phase      Phase         `json:"phase"`
	PIN        string        `json:"pin"`
	Title      string        `json:"title"`
	Players    []PlayerInfo  `json:"players"`
	Question   *QuestionView `json:"question,omitempty"`
	Answered   int           `json:"answered"`
	Reveal     *RevealView   `json:"reveal,omitempty"`
	Me         *MeView       `json:"me,omitempty"`
	ServerTime int64         `json:"serverTime"`
}

func (g *Game) baseView(role string) View {
	v := View{
		Role:       role,
		Phase:      g.phase,
		PIN:        g.PIN,
		Title:      g.Quiz.Title,
		ServerTime: g.now().UnixMilli(),
	}

	list := g.players
	if g.phase != PhaseLobby {
		list = g.ranking()
	}
	v.Players = make([]PlayerInfo, 0, len(list))
	for _, p := range list {
		v.Players = append(v.Players, PlayerInfo{
			ID:       p.ID,
			Name:     p.Name,
			Score:    p.score,
			Online:   p.client != nil,
			Answered: p.answer >= 0,
		})
		if p.answer >= 0 {
			v.Answered++
		}
	}

	if g.phase == PhaseQuestion || g.phase == PhaseReveal {
		q := g.Quiz.Questions[g.index]
		v.Question = &QuestionView{
			Index:     g.index,
			Total:     len(g.Quiz.Questions),
			Text:      q.Text,
			Options:   q.Options,
			TimeLimit: int(q.TimeLimit / time.Second),
			EndsAt:    g.qStarted.Add(q.TimeLimit).UnixMilli(),
		}
	}

	if g.phase == PhaseReveal {
		q := g.Quiz.Questions[g.index]
		counts := make([]int, len(q.Options))
		for _, p := range g.players {
			if p.answer >= 0 {
				counts[p.answer]++
			}
		}
		v.Reveal = &RevealView{Correct: q.Correct, Counts: counts}
	}

	return v
}

func (g *Game) hostView() View {
	return g.baseView("host")
}

func (g *Game) playerView(p *Player) View {
	v := g.baseView("player")
	v.Me = &MeView{
		ID:          p.ID,
		Name:        p.Name,
		Score:       p.score,
		Answer:      p.answer,
		LastGain:    p.lastGain,
		LastCorrect: p.lastCorrect,
		Streak:      p.streak,
	}
	for i, info := range v.Players {
		if info.ID == p.ID {
			v.Me.Place = i + 1
			break
		}
	}
	return v
}

func (g *Game) broadcast() {
	if g.host != nil && !g.push(g.host, g.hostView()) {
		g.host = nil
	}
	for _, p := range g.players {
		if p.client != nil && !g.push(p.client, g.playerView(p)) {
			p.client = nil
		}
	}
}

// если клиент не успевает читать, отключаем его - он переподключится и получит свежий снимок
func (g *Game) push(c *Client, v View) bool {
	return g.send(c, encode("state", v))
}

func (g *Game) send(c *Client, msg []byte) bool {
	if c.closed {
		return false
	}
	select {
	case c.send <- msg:
		return true
	default:
		g.drop(c, ReasonSlow)
		return false
	}
}

func (g *Game) sendError(c *Client, err error) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.send(c, encode("error", errorData{Message: err.Error()}))
}

func (g *Game) drop(c *Client, reason string) {
	if c.closed {
		return
	}
	c.closed = true
	c.reason = reason
	close(c.send)
}
