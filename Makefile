.PHONY: up down logs test test-backend test-frontend e2e screenshots

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f api

test: test-backend test-frontend

test-backend:
	cd backend && go vet ./... && go test -race ./...

test-frontend:
	cd frontend && npm run lint && npm run typecheck && npm test

e2e: up
	docker compose --profile e2e run --rm -e SCREENSHOT_DIR= e2e

screenshots: up
	docker compose --profile e2e run --rm e2e sh -c "npm ci && npx playwright test screenshots"
