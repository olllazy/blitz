package auth

import (
	"encoding/base64"
	"strings"
	"testing"
	"time"
)

func TestTokenRoundTrip(t *testing.T) {
	tokens := NewTokens("secret", time.Hour)

	raw, err := tokens.Issue(42)
	if err != nil {
		t.Fatal(err)
	}
	id, err := tokens.Parse(raw)
	if err != nil || id != 42 {
		t.Fatalf("Parse() = %d, %v", id, err)
	}
}

func TestTokenRejectsForeignSecret(t *testing.T) {
	raw, _ := NewTokens("one", time.Hour).Issue(1)
	if _, err := NewTokens("two", time.Hour).Parse(raw); err == nil {
		t.Fatal("токен с чужой подписью принят")
	}
}

func TestTokenExpires(t *testing.T) {
	tokens := NewTokens("secret", -time.Minute)
	raw, _ := tokens.Issue(1)
	if _, err := tokens.Parse(raw); err == nil {
		t.Fatal("просроченный токен принят")
	}
}

func TestTokenRejectsTampering(t *testing.T) {
	tokens := NewTokens("secret", time.Hour)
	raw, _ := tokens.Issue(1)
	parts := strings.Split(raw, ".")

	// подменили id пользователя, подпись оставили старой
	forged, _ := tokens.Issue(2)
	payload := strings.Split(forged, ".")[1]
	if _, err := tokens.Parse(parts[0] + "." + payload + "." + parts[2]); err == nil {
		t.Fatal("токен с подменённым payload принят")
	}

	none := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"none","typ":"JWT"}`))
	if _, err := tokens.Parse(none + "." + parts[1] + "."); err == nil {
		t.Fatal("токен без подписи принят")
	}
}

func TestPassword(t *testing.T) {
	hash, err := HashPassword("qwerty123")
	if err != nil {
		t.Fatal(err)
	}
	if !CheckPassword(hash, "qwerty123") {
		t.Fatal("правильный пароль не прошёл")
	}
	if CheckPassword(hash, "qwerty124") {
		t.Fatal("неправильный пароль прошёл")
	}
}
