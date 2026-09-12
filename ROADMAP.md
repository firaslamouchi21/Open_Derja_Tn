# Roadmap

Where OpenDerja_TN is going, in order. This is the public trajectory — 

Dates are targets, not promises — this is a solo-maintained, non-profit
project. What's fixed is the order: each phase is a prerequisite for the
next, not a parallel track.

## Phase 0 — Foundations ✅ done june 26-sept26

The backend's structural bones: auth (password, OAuth, 2FA, anonymous guest
sessions), the task engine and consensus model, the corpus/lexicon/translator
data model, admin tooling, a scraper ingestion pipeline, a Rust near-duplicate
detection service, and CI (typecheck, unit tests, migration-drift checks,
CodeQL). This is built and unit-tested.

## Phase 1 — Backend live *(current phase)*

Take the backend from "builds and unit-tests pass" to "runs end-to-end
against a real, reachable deployment" — the gap called out explicitly in the
README. Concretely:

- [x] One-command local stack (`docker compose up`) — Postgres, pgBouncer,
      Redis, the backend API, the worker, and the frontend, wired together
      with migrations and seed data run automatically.
- [ ] Every contributor-facing flow driven end-to-end at least once against
      the live API, not just unit-tested in isolation.
- [ ] First deployment to the VPS behind Cloudflare Tunnel, no inbound ports.
- [ ] Postman/API reference kept current against what's actually deployed.

## Phase 2 — Contributor pages

The frontend today is route scaffolding: every page in the spec exists and
returns 200, but none of them do anything yet. This phase turns stubs into
working pages, page by page, against the now-live backend:

- [ ] Contribute flow (submit text, region self-report, consent, duplicate
      handling)
- [ ] Task claiming and completion (region-tag, confirm, translate,
      transliterate, review, standardise)
- [ ] Corpus browse/search, lexicon browse with regional variant comparison
- [ ] Translator UI backed by `GET /translate`
- [ ] Public coverage/gaps dashboards (regional balance, translator hit-rate)
- [ ] Contributor leaderboard

## Phase 3 — Public launch

- [ ] First published dataset snapshot (versioned, checksummed, licensed per
      source)
- [ ] Outside contributions open — CONTRIBUTING.md workflow exercised by
      someone who isn't the maintainer
- [ ] Regional coverage at a defensible baseline (no region under the 15%
      under-represented threshold by default)
- [ ] Public-facing admin/moderation dashboard for review lanes, flags, and
      corrections

## Phase 4 — Voice & ML

Explicitly gated — nothing here starts before Phase 3 is real, and nothing in
the request path ever waits on inference before this phase.

- [ ] `intelligence-plane/nlp` grows past its health-check stub: real
      inference (standardisation suggestions, translation quality)
- [ ] Voice contribution + consent-scoped media storage and deletion
- [ ] Model-assisted suggestions everywhere, always entering as
      human-confirmed suggestions, never writing a canonical field directly

---

Want to help with something on this list? See [CONTRIBUTING.md](CONTRIBUTING.md).
Phase 2 (contributor pages) is currently where outside help is most useful —
the backend contract for each page already exists in
[docs/API_REFERENCE.md](docs/API_REFERENCE.md).
