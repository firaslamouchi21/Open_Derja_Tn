FROM node:22-slim AS build

RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY frontend/package.json frontend/package.json
COPY shared/package.json shared/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY shared shared
COPY frontend frontend

RUN pnpm --filter @open-derja/shared build

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm --filter @open-derja/frontend build

FROM node:22-slim

WORKDIR /app
COPY --from=build /repo/frontend/.next/standalone ./
COPY --from=build /repo/frontend/.next/static ./frontend/.next/static
COPY --from=build /repo/frontend/public ./frontend/public

WORKDIR /app/frontend
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
