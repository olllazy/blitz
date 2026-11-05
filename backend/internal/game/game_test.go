package game

import (
	"encoding/json"
	"errors"
	"testing"
	"time"
)

func testQuiz(limit time.Duration) Quiz {
	return Quiz{
		ID:    1,
		Title: "тест",
		Questions: []Question{
			{Text: "2 + 2", Options: []string{"3", "4"}, Correct: 1, TimeLimit: limit},
			{Text: "столица франции", Options: []string{"париж", "лион", "ницца"}, Correct: 0, TimeLimit: limit},
		},
	}
}

type fakeClock struct{ t time.Time }

func (c *fakeClock) now() time.Time      { return c.t }
func (c *fakeClock) add(d time.Duration) { c.t = c.t.Add(d) }
func newClock() *fakeClock               { return &fakeClock{t: time.Unix(1_700_000_000, 0)} }

// вычитывает всё, что накопилось в канале, и возвращает последний снимок
func drain(t *testing.T, c *Client) View {
	t.Helper()
	var v View
	got := false
	for {
		select {
		case msg, ok := <-c.Messages():
			if !ok {
				if !got {
					t.Fatal("канал закрыт, а снимков нет")
				}
				return v
			}
			var env struct {
				Type string          `json:"type"`
				Data json.RawMessage `json:"data"`
			}
			if err := json.Unmarshal(msg, &env); err != nil {
				t.Fatal(err)
			}
			if env.Type == "state" {
				if err := json.Unmarshal(env.Data, &v); err != nil {
					t.Fatal(err)
				}
				got = true
			}
		default:
			if !got {
				t.Fatal("нет ни одного снимка состояния")
			}
			return v
		}
	}
}

func TestPoints(t *testing.T) {
	limit := 20 * time.Second

	cases := []struct {
		name    string
		elapsed time.Duration
		streak  int
		want    int
	}{
		{"мгновенный ответ", 0, 1, 1000},
		{"половина времени", 10 * time.Second, 1, 750},
		{"в последний момент", limit, 1, 500},
		{"опоздал", limit + time.Millisecond, 1, 0},
		{"серия из двух", 0, 2, 1100},
		{"бонус не растёт бесконечно", 0, 10, 1300},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := Points(tc.elapsed, limit, tc.streak); got != tc.want {
				t.Fatalf("Points() = %d, want %d", got, tc.want)
			}
		})
	}
}

func TestJoinValidation(t *testing.T) {
	g := newGame("123456", 1, testQuiz(time.Minute), nil)

	if _, err := g.Join("   "); !errors.Is(err, ErrBadName) {
		t.Fatalf("пустое имя: %v", err)
	}
	if _, err := g.Join("Аня"); err != nil {
		t.Fatal(err)
	}
	if _, err := g.Join("аня"); !errors.Is(err, ErrNameTaken) {
		t.Fatalf("дубль имени: %v", err)
	}
	if _, err := g.Join("  Боря   Петров "); err != nil {
		t.Fatal(err)
	}
	if got := g.players[1].Name; got != "Боря Петров" {
		t.Fatalf("имя не нормализовано: %q", got)
	}

	if err := g.Start(); err != nil {
		t.Fatal(err)
	}
	if _, err := g.Join("Вика"); !errors.Is(err, ErrGameStarted) {
		t.Fatalf("вход после старта: %v", err)
	}
}

func TestStartNeedsPlayers(t *testing.T) {
	g := newGame("123456", 1, testQuiz(time.Minute), nil)
	if err := g.Start(); !errors.Is(err, ErrNoPlayers) {
		t.Fatalf("got %v", err)
	}
}

func TestFullGame(t *testing.T) {
	clock := newClock()
	results := make(chan Result, 1)
	g := newGame("123456", 7, testQuiz(20*time.Second), func(r Result) { results <- r })
	g.now = clock.now

	host := NewClient()
	g.AttachHost(host)

	anya, _ := g.Join("Аня")
	borya, _ := g.Join("Боря")
	anyaConn, boryaConn := NewClient(), NewClient()
	g.AttachPlayer(anya.Token(), anyaConn)
	g.AttachPlayer(borya.Token(), boryaConn)

	if v := drain(t, host); len(v.Players) != 2 || !v.Players[0].Online {
		t.Fatalf("ведущий должен видеть двух игроков онлайн: %+v", v.Players)
	}

	if err := g.Start(); err != nil {
		t.Fatal(err)
	}
	if v := drain(t, anyaConn); v.Phase != PhaseQuestion || v.Question.Index != 0 {
		t.Fatalf("ожидали первый вопрос, получили %+v", v)
	}

	// аня отвечает сразу и верно, боря через 10 секунд и неверно
	if err := g.Answer(anya.ID, 1); err != nil {
		t.Fatal(err)
	}
	if err := g.Answer(anya.ID, 0); !errors.Is(err, ErrAlreadyAnswer) {
		t.Fatalf("повторный ответ: %v", err)
	}
	clock.add(10 * time.Second)
	if err := g.Answer(borya.ID, 0); err != nil {
		t.Fatal(err)
	}

	// все ответили - ответ показывается сразу
	v := drain(t, host)
	if v.Phase != PhaseReveal {
		t.Fatalf("phase = %s, want reveal", v.Phase)
	}
	if v.Reveal.Correct != 1 || v.Reveal.Counts[0] != 1 || v.Reveal.Counts[1] != 1 {
		t.Fatalf("неверная статистика: %+v", v.Reveal)
	}

	me := drain(t, anyaConn).Me
	if !me.LastCorrect || me.LastGain != 1000 || me.Place != 1 {
		t.Fatalf("аня: %+v", me)
	}
	if me := drain(t, boryaConn).Me; me.LastCorrect || me.Score != 0 || me.Place != 2 {
		t.Fatalf("боря: %+v", me)
	}

	// второй вопрос: боря отвечает верно, ведущий не ждёт аню
	if err := g.Next(); err != nil {
		t.Fatal(err)
	}
	clock.add(time.Second)
	if err := g.Answer(borya.ID, 0); err != nil {
		t.Fatal(err)
	}
	if err := g.Skip(); err != nil {
		t.Fatal(err)
	}
	if err := g.Answer(anya.ID, 0); !errors.Is(err, ErrTimeUp) {
		t.Fatalf("ответ после показа: %v", err)
	}

	if err := g.Next(); err != nil {
		t.Fatal(err)
	}
	if v := drain(t, host); v.Phase != PhaseFinished {
		t.Fatalf("phase = %s, want finished", v.Phase)
	}

	select {
	case r := <-results:
		if r.HostID != 7 || len(r.Players) != 2 {
			t.Fatalf("result: %+v", r)
		}
		if r.Players[0].Name != "Аня" || r.Players[0].Score != 1000 || r.Players[1].Score != 975 {
			t.Fatalf("неверная таблица: %+v", r.Players)
		}
	case <-time.After(time.Second):
		t.Fatal("onFinish не вызван")
	}
}

func TestTimerReveals(t *testing.T) {
	g := newGame("123456", 1, testQuiz(50*time.Millisecond), nil)
	p, _ := g.Join("Аня")
	g.AttachPlayer(p.Token(), NewClient())

	if err := g.Start(); err != nil {
		t.Fatal(err)
	}

	deadline := time.Now().Add(time.Second)
	for g.Phase() != PhaseReveal {
		if time.Now().After(deadline) {
			t.Fatal("таймер не перевёл игру в показ ответа")
		}
		time.Sleep(5 * time.Millisecond)
	}
}

func TestReconnectReplacesOldConnection(t *testing.T) {
	g := newGame("123456", 1, testQuiz(time.Minute), nil)
	p, _ := g.Join("Аня")

	first, second := NewClient(), NewClient()
	g.AttachPlayer(p.Token(), first)
	g.AttachPlayer(p.Token(), second)

	drain(t, first)
	if _, ok := <-first.Messages(); ok {
		t.Fatal("старое подключение должно быть закрыто")
	}
	if first.Reason() != ReasonReplaced {
		t.Fatalf("reason = %q", first.Reason())
	}
	if v := drain(t, second); v.Me == nil || v.Me.Name != "Аня" {
		t.Fatalf("новое подключение должно получить снимок: %+v", v)
	}

	if _, ok := g.AttachPlayer("чужой-токен", NewClient()); ok {
		t.Fatal("неизвестный токен не должен подключаться")
	}
}

func TestOfflinePlayersDoNotBlock(t *testing.T) {
	g := newGame("123456", 1, testQuiz(time.Minute), nil)
	online, _ := g.Join("Аня")
	g.Join("Боря") // не подключился по ws
	g.AttachPlayer(online.Token(), NewClient())

	g.Start()
	g.Answer(online.ID, 1)

	if g.Phase() != PhaseReveal {
		t.Fatal("ждать офлайн-игрока не нужно")
	}
}
