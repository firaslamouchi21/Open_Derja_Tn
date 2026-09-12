# OpenDerja_TN

[![CI](https://github.com/firaslamouchi21/Open_Derja_Tn/actions/workflows/master.yml/badge.svg)](https://github.com/firaslamouchi21/Open_Derja_Tn/actions/workflows/master.yml)

An open, regionally balanced written corpus of Tunisian Derja. Tunisians write, correct, and confirm
their own regional Derja; what comes out is a citable dataset, a lexicon, and a translator built
directly on top of it. Text first, voice by design in a later phase.

This is a non-profit project, solo-maintained by [Firas Lamouchi](https://github.com/firaslamouchi21).
It's aiming to go public and start taking outside contributions — this repo is being prepared for
that now.

> **📄 Start here:** the full technical ledger — what this is, what it deliberately isn't, the data
> model, the task engine, the threat model, what's still unsolved.
> [English (PDF)](Documentation/proposal%20docs/OpenDerja_TN_technical_ledger.pdf) ·
> [English (HTML)](Documentation/proposal%20docs/OpenDerja_TN_technical_ledger.html) ·
> [Français (PDF)](Documentation/proposal%20docs/OpenDerja_TN_technical_ledger.fr.pdf) ·
> [Français (HTML)](Documentation/proposal%20docs/OpenDerja_TN_technical_ledger.fr.html)
> Read it before proposing anything that touches the data model, the task system, or auth.

<p align="center">
  <img src="docs/diagrams/architecture.svg" alt="Three-plane architecture: frontend, control-plane, data-plane, intelligence-plane" width="100%">
</p>
<p align="center">
  <img src="docs/diagrams/roadmap.svg" alt="Roadmap: Phase 0 foundations done, Phase 1 backend live current, Phase 2 contributor pages next" width="49%">
  <img src="docs/diagrams/api-surface.svg" alt="Backend API surface by access level: 16 public, 15 auth, 6 contributor, 16 reviewer, 4 admin routes" width="49%">
</p>

## Where things actually stand

Read this before assuming anything works. The project keeps its own honest ledger of what's been
driven end-to-end versus what's built-but-unverified versus what doesn't exist yet — that ledger is
gitignored (it's a working file, not a promise to the public), but the short version:

- The **backend** (`control-plane/backend`, NestJS + Prisma) is substantially built: auth (password,
  OAuth, 2FA, anonymous contributor sessions), the task engine, consensus, admin tooling, a scraper
  pipeline, and a Rust dedup service. It has real unit test coverage. It has **not** been run end-to-end
  against a live deployment yet — that's the next real milestone, not a formality.
- The **frontend** (`frontend`, Next.js) is route scaffolding — every page in the spec exists as a
  stub that builds and returns 200, not as a working page. This is where outside contribution is
  most useful right now.
- The **data-plane** (Rust) and **intelligence-plane** (Python) are intentionally minimal — most of
  each stays a health-check stub until there's a measured reason to build further, not a phase timer.

If you're picking up a PR here expecting a finished product, you'll be disappointed. If you're
picking it up expecting a real, working backend with obvious frontend gaps to fill, that's accurate.

## Why this exists

Tunisian Derja is spoken by roughly twelve million people every day and has almost no proper written
record. What exists is scattered, small, or academic-and-frozen the day the paper ships. This project
is trying to build something that keeps growing instead: regionally balanced on purpose (coverage per
region is tracked and published, not hoped for), built on CODA-TUN conventions rather than inventing a
new spelling standard, and usable as a tool (a translator, a lexicon) rather than only downloadable as
a file.

The full reasoning lives in the technical ledger linked at the top of this file. A lot of the
decisions in there look arbitrary until you see the failure mode they're avoiding — read it before
proposing anything that touches the data model, the task system, or auth.

## Architecture, briefly

Three planes, split by language for a reason, not by habit:

- **`control-plane/`** (TypeScript) — `backend` (NestJS API), `worker` (pg-boss background jobs),
  `scrapers` (source ingestion). This is where almost all the logic lives, and stays TypeScript
  permanently.
- **`data-plane/`** (Rust) — CPU-bound work that's been *measured* to need it. Right now that's just
  near-duplicate detection (MinHash/LSH); everything else is a stub until profiling says otherwise.
- **`intelligence-plane/`** (Python, FastAPI) — ML inference and training, phase-gated. Health-check
  stub for now; nothing in the request path ever waits on it.

`db/` holds the Prisma schema and migrations (Postgres). `shared/` holds the TypeScript enums and zod
schemas used across packages. `frontend/` is the Next.js app.

For the full picture — diagrams included, written for both developers and non-developers — see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). If you're building against the backend (frontend or
otherwise), [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) lists every endpoint, what it expects,
and what it returns.

## Getting started

You'll need [Docker](https://docs.docker.com/get-docker/) (with Compose v2) and nothing else — the
whole stack, including Node itself, runs inside containers.

```bash
git clone https://github.com/firaslamouchi21/Open_Derja_Tn.git
cd Open_Derja_Tn
cp .env.example .env
docker compose up --build
```

That one command builds and starts every service — Postgres, pgBouncer, Redis, the NLP/processing
stubs, the backend API, the worker, and the frontend — and runs migrations plus the seed data
(marker-term list, system/bot user, the standardisation-rules table) automatically before the
backend starts. First run downloads and compiles everything, so it takes a few minutes; after that,
`docker compose up` is fast. When it settles: backend on `http://localhost:3000` (`/health` should
return `{"status":"ok"}`), frontend on `http://localhost:3001`. `docker compose down` stops it.

The default `.env` values work out of the box for local development. Open `.env` before deploying
anywhere real and replace every `change-me-to-a-random-string` / `placeholder-change-me` value —
`AUTH_SECRET` in particular should be a real random string (`openssl rand -base64 32` works). Never
commit `.env`.

A ready-made [Postman collection](docs/postman/OpenDerja_TN.postman_collection.json) covers every
endpoint in [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) — import it, point `baseUrl` at
`http://localhost:3000`, and start calling routes without writing any requests by hand.

### Running without Docker

If you'd rather run each package natively (faster iteration on backend code, no rebuild-on-every-change
Docker layer), you'll need Node 18+ and [pnpm](https://pnpm.io/) 9:

```bash
pnpm install
pnpm infra:up                                   # postgres, pgbouncer, redis, nlp/processing stubs only
pnpm --filter @open-derja/db run migrate:deploy # apply migrations (uses DIRECT_URL)
pnpm --filter @open-derja/db run generate       # generate the Prisma client — do this before the next line
pnpm --filter @open-derja/core --filter @open-derja/scrapers run build # backend/worker import these as built packages, not source
pnpm --filter @open-derja/db run seed:all       # marker-term list, system/bot user, standardisation-rules table
pnpm --filter @open-derja/backend run start:dev # backend on :3000
pnpm --filter @open-derja/worker run start:dev  # background jobs (optional for API work)
pnpm --filter @open-derja/frontend run dev      # frontend on :3001
```

The standardisation-rules seed is real but has no rule content yet — writing actual CODA-TUN spelling
rules is a linguistics decision, not a code one, and is documented as a known open gap in
`db/DATABASE_NOTES.md` rather than guessed at. The contribution source seeds itself lazily on first
use, so it needs no seed script at all.

### Running tests

```bash
pnpm test:unit    # Jest — the TypeScript packages
pnpm test:shell   # bats — shell scripts under testing/shell
pnpm test:ops     # bats — ops scripts under testing/ops
cd data-plane && cargo test   # Rust
```

### A Windows-specific build note

`pnpm --filter @open-derja/frontend run build` produces every page correctly, but the last step
(copying traced dependency files for the Docker `standalone` output) creates symlinks, and Windows
only allows unprivileged symlink creation with Developer Mode turned on. Without it, the build still
generates every page — the error shows up only in that last, deployment-only step. It's a Windows
permission setting, not a bug in this repo: it doesn't happen in the Docker build itself (Linux
doesn't have this restriction), and it doesn't affect `pnpm dev` at all. If you want a clean
`pnpm build` locally on Windows, turn on Developer Mode in Windows Settings first.

CI runs on every push and pull request (`.github/workflows/master.yml`): typecheck, unit tests,
shell/ops tests, migration-drift check, builds, CodeQL, and `cargo test` for the Rust crate. Run the
test suite locally before opening a PR anyway — it's faster than waiting on the runner.

## Roadmap

See [`ROADMAP.md`](ROADMAP.md) for where this is headed — Phase 0 (backend foundations) is done,
Phase 1 (backend live end-to-end) is current, and Phase 2 (turning the frontend's route scaffolding
into real pages) is where outside contribution is currently most useful.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the actual workflow, and
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) for how people are expected to treat each other here.

## License

The **code** in this repository is licensed under [Apache 2.0](LICENSE).

The **corpus data** (once published) is licensed separately and per-source — see the technical ledger
linked above for the licensing tiers. Code license and data license are two different questions;
don't assume one from the other.
