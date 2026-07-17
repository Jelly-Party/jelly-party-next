# syntax=docker/dockerfile:1

# Vite+ supplies the build-time Node.js runtime and package manager.
FROM ghcr.io/voidzero-dev/vite-plus:0.2.5 AS base
WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# ============================================
# Dependencies Stage: Install all dependencies
# ============================================
FROM base AS deps
COPY packages/jelly-party-lib/package.json ./packages/jelly-party-lib/
COPY packages/jelly-party-server/package.json ./packages/jelly-party-server/

RUN vp install --frozen-lockfile

# ============================================
# Build Stage: Build server packages
# ============================================
FROM deps AS build
COPY packages/jelly-party-lib ./packages/jelly-party-lib
COPY packages/jelly-party-server ./packages/jelly-party-server
RUN vp run jelly-party-lib#build && vp run jelly-party-server#build

# ============================================
# Server Target (only deployable via Docker)
# Website, Join, and Status are deployed via Vercel
# ============================================
FROM node:24-alpine AS server
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/jelly-party-server/node_modules ./packages/jelly-party-server/node_modules
COPY --from=deps /app/packages/jelly-party-lib/node_modules ./packages/jelly-party-lib/node_modules
COPY --from=build /app/packages/jelly-party-lib ./packages/jelly-party-lib
COPY --from=build /app/packages/jelly-party-server ./packages/jelly-party-server

WORKDIR /app/packages/jelly-party-server
EXPOSE 8080 9090
CMD ["node", "dist/main.js"]
