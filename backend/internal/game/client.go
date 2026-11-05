package game

import "encoding/json"

const (
	ReasonReplaced = "replaced"
	ReasonClosed   = "closed"
	ReasonSlow     = "slow"
)

// одно ws-подключение. все поля меняются только под мьютексом игры
type Client struct {
	send   chan []byte
	closed bool
	reason string
}

func NewClient() *Client {
	return &Client{send: make(chan []byte, 32)}
}

func (c *Client) Messages() <-chan []byte {
	return c.send
}

// можно читать только после того, как канал закрыт
func (c *Client) Reason() string {
	return c.reason
}

type envelope struct {
	Type string `json:"type"`
	Data any    `json:"data"`
}

func encode(kind string, data any) []byte {
	b, _ := json.Marshal(envelope{Type: kind, Data: data})
	return b
}

type errorData struct {
	Message string `json:"message"`
}

type command struct {
	Type   string `json:"type"`
	Option int    `json:"option"`
}
