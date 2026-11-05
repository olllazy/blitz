package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/coder/websocket"

	"blitz/internal/game"
)

const (
	writeTimeout = 5 * time.Second
	pingInterval = 20 * time.Second
	helloTimeout = 5 * time.Second
)

// коды закрытия 4000+ клиент считает окончательными и не переподключается
var closeCodes = map[string]websocket.StatusCode{
	game.ReasonReplaced: 4000,
	game.ReasonClosed:   4001,
	game.ReasonSlow:     websocket.StatusTryAgainLater,
}

const (
	codeForbidden     websocket.StatusCode = 4003
	codeUnknownPlayer websocket.StatusCode = 4004
	codeUnauthorized  websocket.StatusCode = 4401
)

func (h *Handler) accept(w http.ResponseWriter, r *http.Request) (*websocket.Conn, error) {
	return websocket.Accept(w, r, &websocket.AcceptOptions{OriginPatterns: h.cfg.AllowedOrigins})
}

// браузер не показывает http-статус неудачного upgrade, поэтому отказы отправляем кодом закрытия
func reject(conn *websocket.Conn, code websocket.StatusCode, reason string) {
	conn.Close(code, reason)
}

// ведущий авторизуется кукой, она уходит вместе с upgrade-запросом
func (h *Handler) hostSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := h.accept(w, r)
	if err != nil {
		return
	}
	defer conn.CloseNow()

	userID, ok := h.userID(r)
	if !ok {
		reject(conn, codeUnauthorized, "unauthorized")
		return
	}

	g := h.games.Get(r.PathValue("pin"))
	if g == nil {
		reject(conn, closeCodes[game.ReasonClosed], "game not found")
		return
	}
	if g.HostID != userID {
		reject(conn, codeForbidden, "not your game")
		return
	}

	c := game.NewClient()
	g.AttachHost(c)
	defer g.Detach(c)

	serve(r.Context(), conn, c, func(data []byte) { g.HandleHost(c, data) })
}

// токен игрока приходит первым сообщением, а не в url - так он не попадёт в логи
func (h *Handler) playerSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := h.accept(w, r)
	if err != nil {
		return
	}
	defer conn.CloseNow()

	g := h.games.Get(r.PathValue("pin"))
	if g == nil {
		reject(conn, codeUnknownPlayer, "game not found")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), helloTimeout)
	_, data, err := conn.Read(ctx)
	cancel()
	if err != nil {
		return
	}

	var hello struct {
		Type  string `json:"type"`
		Token string `json:"token"`
	}
	if json.Unmarshal(data, &hello) != nil || hello.Type != "hello" {
		reject(conn, websocket.StatusPolicyViolation, "expected hello")
		return
	}

	c := game.NewClient()
	p, ok := g.AttachPlayer(hello.Token, c)
	if !ok {
		reject(conn, codeUnknownPlayer, "unknown player")
		return
	}
	defer g.Detach(c)

	serve(r.Context(), conn, c, func(data []byte) { g.HandlePlayer(p, c, data) })
}

func serve(ctx context.Context, conn *websocket.Conn, c *game.Client, onMessage func([]byte)) {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	go func() {
		defer cancel()
		ticker := time.NewTicker(pingInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case msg, ok := <-c.Messages():
				if !ok {
					code, found := closeCodes[c.Reason()]
					if !found {
						code = websocket.StatusNormalClosure
					}
					conn.Close(code, c.Reason())
					return
				}
				wctx, wcancel := context.WithTimeout(ctx, writeTimeout)
				err := conn.Write(wctx, websocket.MessageText, msg)
				wcancel()
				if err != nil {
					return
				}
			case <-ticker.C:
				pctx, pcancel := context.WithTimeout(ctx, writeTimeout)
				err := conn.Ping(pctx)
				pcancel()
				if err != nil {
					return
				}
			}
		}
	}()

	for {
		_, data, err := conn.Read(ctx)
		if err != nil {
			return
		}
		onMessage(data)
	}
}
