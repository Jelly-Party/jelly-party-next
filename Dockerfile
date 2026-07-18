# syntax=docker/dockerfile:1

# Vite+ supplies the build-time Node.js runtime and package manager.
FROM ghcr.io/voidzero-dev/vite-plus:0.2.5 AS base
WORKDIR /app
USER root
ENV CI=true

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
RUN vp install --prod --frozen-lockfile

# ============================================
# Server target. The static website and join page are deployed separately.
# ============================================
FROM node:24-alpine AS server
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/jelly-party-server/node_modules ./packages/jelly-party-server/node_modules
COPY --from=build /app/packages/jelly-party-lib ./packages/jelly-party-lib
COPY --from=build /app/packages/jelly-party-server ./packages/jelly-party-server

WORKDIR /app/packages/jelly-party-server
EXPOSE 8080
USER node
CMD ["node", "dist/main.js"]
