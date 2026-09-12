# Changelog

Notable, user-visible milestones for OpenDerja_TN

## backend-v1.0.0 — 2026-09-11

First complete backend milestone: the NestJS API, task engine, and data model are built out and
unit-tested end to end, and the whole stack (Postgres, pgBouncer, Redis, the backend API, the worker,
and the NLP/processing stubs) now runs from a single `docker compose up`, migrations and seed data
included.

**Included:**
- Auth: password + OAuth (GitHub/Google) + mandatory 2FA for privileged roles, plus anonymous
  guest-session contribution — no signup required to contribute, correct, or confirm.
- Task engine and consensus model: idempotent task claiming, region-tagging, confirmation,
  translation, transliteration, review, standardisation, and adjudication task types.
- Corpus, lexicon, and translator data model with span-anchored annotations and regional-variant
  tracking (`shared/`, `db/`).
- Admin & moderation tooling: overview dashboard, user/trust management, review lanes, corrections
  and flags, source management, dataset snapshots.
- Scraper ingestion pipeline (`control-plane/scrapers`) with a Rust near-duplicate detection service
  (`data-plane`, MinHash/LSH) in the loop.
- Presigned-URL file storage flow with re-verified upload confirmation (never trusts a client "done"
  signal).
- CI: typecheck, unit tests (387+ passing), shell/ops tests, migration-drift check, CodeQL, and
  `cargo test` for the Rust crate, on every push and PR.
- One-command local dev stack (`docker compose up`) — see [README.md](README.md#getting-started).
- Full [API reference](docs/API_REFERENCE.md) and a ready-made
  [Postman collection](docs/postman/OpenDerja_TN.postman_collection.json) covering every endpoint.

**Known gaps, :**
- Not yet deployed to a live, publicly reachable environment — that's Phase 1's remaining item, see
  [ROADMAP.md](ROADMAP.md).
- The frontend is route scaffolding only; no contributor-facing page is wired to the backend yet
  (Phase 2).
- `intelligence-plane/nlp` and most of `data-plane` remain health-check stubs on purpose — no ML
  inference is in the request path yet (Phase 4, explicitly gated).
- CODA-TUN standardisation rule content is not yet written (seed table exists, empty by design — see
  `db/DATABASE_NOTES.md`).

See [ROADMAP.md](ROADMAP.md) for what comes next.
