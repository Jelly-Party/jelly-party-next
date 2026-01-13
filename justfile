# Jelly Party Development Commands

# Default: list available commands
list:
    @just --list

# Install all dependencies
install:
    pnpm install

# Development: run all services (Ctrl+C stops all)
dev:
    @echo "Starting development servers (Ctrl+C to stop all)..."
    pnpm run dev

# Show development logs
logs lines="":
    tail -f -n {{ if lines == "" { "100" } else { lines } }} .dev/dev.log

# Development: run backend services only (for tests)
dev-services:
    @echo "Starting backend services..."
    pnpm run dev:services

# Test: run backend services + log streamer (for E2E tests)
test-services:
    @echo "Starting test services (backend + log streamer)..."
    pnpm run test:services

# Stop all dev processes (emergency fallback)
stop:
    node .dev/stop.js

# Clean everything (including runtime artifacts)
destroy:
    @just stop
    @just clean

# Development: extension only (opens Chrome with extension)
dev-extension:
    pnpm --filter jelly-party-extension dev

# Development: extension in Firefox
dev-extension-firefox:
    cd packages/jelly-party-extension && pnpm exec vite --mode development -- --browser firefox

# Development: server only
dev-server:
    pnpm --filter jelly-party-server dev

# Build all packages
build:
    pnpm --filter '*' build

# Build specific package
build-pkg pkg:
    pnpm --filter {{pkg}} build

# Run E2E tests (builds test extension first with pre-granted permissions)
test:
    pnpm --filter jelly-party-extension build:test
    pnpm exec playwright test

# Run E2E tests with Playwright UI (interactive debugging)
test-ui:
    pnpm --filter jelly-party-extension build:test
    pnpm exec playwright test --ui

# Run E2E tests in headed mode (watch browser)
test-headed:
    pnpm --filter jelly-party-extension build:test
    pnpm exec playwright test --headed

# Type check all packages
check:
    pnpm --filter '*' check

# Lint all packages
lint:
    pnpm lint

# Fix lint issues
lint-fix:
    pnpm lint:fix

# Fix all auto-fixable errors
fix: format lint-fix

# Format all code
format:
    pnpm format

# Docker build server (static sites deploy via Vercel)
docker-build:
    docker build --target server -t jelly-party-server:latest .

# Clean all build artifacts
clean:
    rm -rf packages/*/dist
    rm -rf packages/*/dist-test
    rm -rf packages/*/.svelte-kit
    rm -rf node_modules/.cache
    rm -f .dev/dev.pid .dev/dev.log
