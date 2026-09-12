FROM node:22-slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY control-plane/worker/package.json control-plane/worker/package.json
COPY control-plane/backend/core/package.json control-plane/backend/core/package.json
COPY control-plane/scrapers/package.json control-plane/scrapers/package.json
COPY db/package.json db/package.json
COPY shared/package.json shared/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY db db
COPY shared shared
COPY control-plane/backend/core control-plane/backend/core
COPY control-plane/scrapers control-plane/scrapers
COPY control-plane/worker control-plane/worker

RUN pnpm --filter @open-derja/db generate
RUN pnpm --filter @open-derja/core build
RUN pnpm --filter @open-derja/scrapers build
RUN pnpm --filter @open-derja/worker build
RUN pnpm install --frozen-lockfile --ignore-scripts --prod

FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo
COPY --from=build /repo .

WORKDIR /repo/control-plane/worker
CMD ["node", "dist/main.js"]
