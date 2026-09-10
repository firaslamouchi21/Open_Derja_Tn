# Contributing to OpenDerja_TN

Thanks for looking at this. It's a non-profit, solo-maintained project, so review and merge times
depend on one person's actual availability — please be patient, and don't take a slow response as a
signal your contribution isn't wanted.

## Ways to help right now

- **Frontend.** Every page exists as a route stub, not a working page. This is the highest-value
  place for outside contribution today — see the README for what's built versus scaffolded, and
  [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) for every backend endpoint you have available to
  build against, with request/response shapes already worked out.
- **Backend.** Smaller, more surgical fixes: bugs, missing test coverage, filling in a documented gap
  (check `db/DATABASE_NOTES.md` for known missing pieces like seed scripts).
- **Corpus data.** Not yet — the contribution flow needs to be live and reviewed before outside text
  submissions make sense. This will open up once the frontend catches up.
- **Docs, bug reports, and questions.** Always useful, no experience threshold.

If you want to work on something substantial, open an issue first and describe what you're planning.
It's a lot cheaper to redirect a plan than to redirect a finished PR.

## Setting up locally

See the "Getting started" section in [`README.md`](README.md). If something in there is wrong or out
of date, that's itself worth a PR.

## Before you open a PR

Run the relevant test suite and make sure it passes:

```bash
pnpm test:unit             # TypeScript packages
cd data-plane && cargo test   # if you touched data-plane
```

CI is currently disabled while the project is pre-launch, so this won't happen for you automatically —
it's on you to check locally.

## Code style
Beyond that: match the style of the surrounding code. This codebase doesn't use a single opinionated
formatter/linter config to defer to — read the file you're editing and follow its conventions
(naming, error handling, how services are structured) rather than introducing a new pattern in one PR.

## Architecture rules that aren't obvious from the code

A few decisions in the data model and task system look arbitrary until you know what they're
preventing. Read `db/DATABASE_NOTES.md` before touching migrations, and skim the technical ledger
(linked from the README) before touching the task engine or auth. The short version of the ones that
bite hardest if ignored:

- **Region is a set, never a single value** (`northwest`/`north`/`sahel`/`south`) — Tunisian dialect
  is a continuum, and collapsing it to one value loses real information a reviewer needs.
- **Annotations attach to character spans**, not whole segments, even for segment-wide properties.
  A null span breaks the model that consensus and standardisation both depend on.
- **Tasks carry a mandatory idempotency key with a `slot`.** Omitting `slot` silently collapses
  legitimate parallel tasks into one, with no error to tell you it happened.
- **Nothing hard-deletes** except consent-revocation PII scrubbing. Everything else is
  soft-delete plus an `audit_log` row with a reversible diff.
- **Migrations run against `DIRECT_URL`; the application runs against `DATABASE_URL`** (pooled via
  pgBouncer). Mixing these up breaks migrations in ways that are annoying to debug.
- Four constraints in the database (a partial unique index, three CHECK constraints) exist only as
  raw SQL in migration files because Prisma's schema language can't express them — `prisma migrate
  diff` will silently propose dropping them if you're not careful. `db/DATABASE_NOTES.md` has the
  full list.

If a change you're making seems to require breaking one of these, say so explicitly in the PR
description rather than working around it quietly — there's usually a reason, but not always, and
it's worth a conversation either way.

## Commit messages and PRs

- Keep a PR scoped to one logical change. A drive-by fix bundled into an unrelated feature PR makes
  both harder to review.
- Write commit messages in the imperative mood ("add," not "added" or "adds") and explain *why* when
  the "what" isn't self-evident from the diff.
- In the PR description, say what changed, why, and how you tested it. "Tests pass" isn't itself proof
  — mention what you actually ran or clicked through.

## Code of conduct

Participation in this project is governed by [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
