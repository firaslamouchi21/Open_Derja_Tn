FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY db/package.json db/package.json
RUN pnpm install --filter @open-derja/db --frozen-lockfile --ignore-scripts

COPY db db

WORKDIR /repo/db
CMD ["sh", "-c", "npx prisma migrate deploy --schema=schema.prisma && npx prisma generate --schema=schema.prisma && npx tsx seeds/marker-terms.seed.ts && npx tsx seeds/system-user.seed.ts && npx tsx seeds/standardisation-rules.seed.ts"]
