.PHONY: help install codegen dev dev-api dev-web db-up db-down seed test test-unit test-int test-e2e lint typecheck format clean

# Detect pnpm on PATH; fall back to the Windows LOCALAPPDATA install.
PNPM ?= $(shell command -v pnpm 2>/dev/null || echo "$(LOCALAPPDATA)/pnpm/pnpm")

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install all JS and .NET deps
	$(PNPM) install
	dotnet restore Atlas.sln

codegen: ## Regenerate C# records from schema.ts
	$(PNPM) run codegen

db-up: ## Start Postgres in Docker
	docker compose up -d db

db-down: ## Stop Postgres
	docker compose down

seed: db-up ## Seed workspace from fixtures/
	dotnet run --project apps/api/Atlas.Api -- seed

dev-api: codegen ## Run the API with hot reload
	dotnet watch --project apps/api/Atlas.Api run

dev-web: ## Run the web app with hot reload
	$(PNPM) run dev:web

dev: db-up ## Start db + api + web (run in separate terminals in practice)
	@echo "Start in three terminals:"
	@echo "  1. make dev-api"
	@echo "  2. make dev-web"
	@echo "  3. (optional) docker compose logs -f db"

test-unit: ## Run unit tests (TS + .NET)
	$(PNPM) test
	dotnet test Atlas.sln --filter Category=Unit --nologo

test-int: db-up ## Run integration tests (Testcontainers + .NET)
	dotnet test Atlas.sln --filter Category=Integration --nologo

test-e2e: ## Run Playwright playback tests
	$(PNPM) run e2e

test: test-unit test-int test-e2e ## Run all three tiers

typecheck: ## TypeScript + .NET type-check
	$(PNPM) run typecheck
	dotnet build Atlas.sln --nologo -v minimal

lint: ## Lint (TS + Prettier + dotnet format)
	$(PNPM) run lint
	$(PNPM) run format:check
	dotnet format Atlas.sln --verify-no-changes --no-restore

format: ## Auto-format everything
	$(PNPM) run format
	dotnet format Atlas.sln --no-restore

clean: ## Remove build artifacts
	$(PNPM) -r exec rm -rf dist .vite
	dotnet clean Atlas.sln --nologo
