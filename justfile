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
    @echo "  - Server: ws://localhost:8080"
    @echo "  - Join page: http://localhost:5180"
    @echo "  - Extension: Chrome opens automatically"
    pnpm --filter jelly-party-server dev & \
    pnpm --filter jelly-party-join dev & \
    pnpm --filter jelly-party-extension dev & \
    wait

# Stop any leftover dev processes (if needed)
stop:
    -pkill -f "tsx watch" 2>/dev/null || true
    -pkill -f "vite" 2>/dev/null || true
    @echo "Stopped any running dev processes"

# Clean everything
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
    rm -rf packages/*/.svelte-kit
    rm -rf node_modules/.cache
