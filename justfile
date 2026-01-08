# Jelly Party Development Commands

# Default: list available commands
list:
    @just --list

# Install all dependencies
install:
    pnpm install

# Development: run all services in dev mode
dev:
    @echo "Starting development servers..."
    pnpm --filter jelly-party-extension dev &
    pnpm --filter jelly-party-server dev &
    pnpm --filter jelly-party-website dev &
    wait

# Development: extension only (with watch mode)
dev-extension:
    pnpm --filter jelly-party-extension dev

# Development: server only
dev-server:
    pnpm --filter jelly-party-server dev

# Build all packages
build:
    pnpm --filter '*' build

# Build specific package
build-pkg pkg:
    pnpm --filter {{pkg}} build

# Run all tests
test:
    pnpm --filter '*' test

# Type check all packages
check:
    pnpm --filter '*' check

# Lint all packages
lint:
    pnpm lint

# Fix lint issues
lint-fix:
    pnpm lint:fix

# Format all code
format:
    pnpm format

# Docker build server (static sites deploy via Vercel)
docker-build:
    docker build --target server -t jelly-party-server:latest .

# Clean all build artifacts
clean:
    rm -rf packages/*/dist
    rm -rf packages/*/.svelte-kit
    rm -rf node_modules/.cache
