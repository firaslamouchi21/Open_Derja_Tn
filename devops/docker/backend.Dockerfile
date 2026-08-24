FROM node:22-slim AS build

RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json backend/package.json
COPY backend/core/package.json backend/core/package.json
COPY db/package.json db/package.json
COPY shared/package.json shared/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY db db
COPY shared shared
COPY backend/core backend/core
COPY backend backend

RUN pnpm --filter @open-derja/backend rebuild argon2
RUN pnpm --filter @open-derja/db generate
RUN pnpm --filter @open-derja/core build
RUN pnpm --filter @open-derja/backend build
RUN pnpm install --frozen-lockfile --ignore-scripts --prod
RUN pnpm --filter @open-derja/backend rebuild argon2

FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && npm install -g pm2

WORKDIR /repo
COPY --from=build /repo .

WORKDIR /repo/backend
EXPOSE 3000

CMD ["pm2-runtime", "start", "ecosystem.config.js"]
