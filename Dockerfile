# syntax=docker/dockerfile:1

# ============================================
# Base Stage: Common dependencies
# ============================================
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml pnpm-lock.yaml ./

# ============================================
# Dependencies Stage: Install all dependencies
# ============================================
FROM base AS deps
COPY package.json ./
COPY packages/jelly-party-lib/package.json ./packages/jelly-party-lib/
COPY packages/jelly-party-server/package.json ./packages/jelly-party-server/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ============================================
# Build Stage: Build server packages
# ============================================
FROM deps AS build
COPY packages/jelly-party-lib ./packages/jelly-party-lib
COPY packages/jelly-party-server ./packages/jelly-party-server
RUN pnpm --filter jelly-party-lib --filter jelly-party-server build

# ============================================
# Server Target (only deployable via Docker)
# Website, Join, and Status are deployed via Vercel
# ============================================
FROM base AS server
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/jelly-party-server/node_modules ./packages/jelly-party-server/node_modules
COPY --from=deps /app/packages/jelly-party-lib/node_modules ./packages/jelly-party-lib/node_modules
COPY --from=build /app/packages/jelly-party-lib ./packages/jelly-party-lib
COPY --from=build /app/packages/jelly-party-server ./packages/jelly-party-server

WORKDIR /app/packages/jelly-party-server
EXPOSE 8080
CMD ["node", "dist/main.js"]
