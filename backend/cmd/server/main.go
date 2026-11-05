package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"blitz/internal/auth"
	"blitz/internal/game"
	"blitz/internal/httpapi"
	"blitz/internal/store"
)

func main() {
	log := slog.New(slog.NewTextHandler(os.Stdout, nil))
	if err := run(log); err != nil {
		log.Error("server stopped", "err", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger) error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	secret := env("JWT_SECRET", "")
	if secret == "" {
		return errors.New("JWT_SECRET is required")
	}

	st, err := store.Connect(ctx, env("DATABASE_URL", "postgres://blitz:blitz@localhost:5432/blitz?sslmode=disable"))
	if err != nil {
		return err
	}
	defer st.Close()

	if err := st.Migrate(ctx); err != nil {
		return err
	}
	if env("SEED_DEMO", "true") == "true" {
		hash, err := auth.HashPassword(store.DemoPassword)
		if err != nil {
			return err
		}
		if err := st.SeedDemo(ctx, hash); err != nil {
			return err
		}
	}

	games := game.NewManager(func(r game.Result) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := st.SaveGame(ctx, r); err != nil {
			log.Error("save game result", "pin", r.PIN, "err", err)
		}
	})
	go games.Run(ctx)

	var origins []string
	if raw := env("ALLOWED_ORIGINS", ""); raw != "" {
		origins = strings.Split(raw, ",")
	}

	h := httpapi.New(st, games, auth.NewTokens(secret, 7*24*time.Hour), httpapi.Config{
		CookieSecure:   env("COOKIE_SECURE", "false") == "true",
		AllowedOrigins: origins,
	}, log)

	srv := &http.Server{
		Addr:              env("ADDR", ":8080"),
		Handler:           h.Routes(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	log.Info("listening", "addr", srv.Addr)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

func env(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return fallback
}
