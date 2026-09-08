
créé le 15 juin 2026, lel les contributors li ba3di

Ahla bik c'est important l'ay migration bech tsir fel future.

Critical Rule: Raw SQL Constraints
schema.prisma is incomplete. Four crucial constraints live only in 20260823131356_init/migration.sql because Prisma DSL can't express partial indexes or multi-column CHECK rules.

If you regenerate migrations via Prisma, it will silently drop these:

tasks_idem_key_live_unique: Partial unique index on idem_key (prevents duplicate tasks).

single_translation_target: CHECK that exactly one translation target is set.

translations_*_preferred_unique: 3 partial unique indexes for preferred translations.

tags_value_matches_kind: CHECK enforcing valid enum values on tags.

Warning: Always manually verify generated migrations and re-append these raw SQL blocks and pg_trgm indexes before applying them.

Search & Search Indexes

Trigram search indexes (corpus_items_match_key_trgm, etc.) use gin_trgm_ops for Arabic fuzzy matching. Prisma doesn't track them and will try to drop them on migrate diff.

Dev Environment & Setup

Ports: Postgres on 5532, PgBouncer on 6532.


chabeb pg bouncer mch lel migrations!!
Migrations: Always run against DIRECT_URL (direct to Postgres). Never migrate through PgBouncer.



Required Seeding Before Running Tasks

System User: Create a bot/system row in users (annotatorId cannot be null, even for machine actions).
`db/seeds/system-user.seed.ts` (`pnpm --filter @open-derja/db run seed:system-user`) upserts a fixed-id
(`00000000-0000-0000-0000-000000000001`), passwordless, emailless `admin`-role row for this. Nothing in
the request path currently creates machine annotations automatically (intelligence-plane is phase-gated),
so this seed isn't blocking anything today — it exists so the id is stable and ready once it is needed.

Contribution Source: no longer a manual seeding step — `getOrCreateContributionSource()` in
`corpus-items.service.ts` (and the equivalent in `control-plane/scrapers`) creates the `contribution`
kind row in `sources` lazily on first use if it doesn't already exist.

Rules: Seed baseline CODA-TUN standardisation_rules. The seed script now exists
(`db/seeds/standardisation-rules.seed.ts`, `pnpm --filter @open-derja/db run seed:standardisation-rules`)
but `standardisation-rules.data.ts` ships with an empty rule list on purpose — writing real CODA-TUN
pattern/replacement pairs is a linguistic decision, not a code one, and nobody should invent those rules
without the background to get them right. This is a genuine remaining content gap, not a code gap.

---

Migrations added 2026-08-30 (all generated offline with `prisma migrate diff
--from-schema-datamodel <old> --to-schema-datamodel <new> --script` so they are purely
additive and never touched the raw-SQL blocks above; each was applied with `prisma
migrate deploy`, and the four raw guards + `*_trgm` indexes were verified still present
afterwards):

- `20260830000000_admin_and_auth_tables` — `email_otps`, `reviewer_invites`,
  `consent_revocations`, `feature_flags`, `system_settings`.
- `20260830010000_auth_identities` — `auth_identities` (`user_id · provider ·
  provider_user_id · email`, unique `(provider, provider_user_id)`). **`users.github_id`
  was migrated INTO this table then dropped** — the migration file hand-orders the
  backfill INSERT before the DROP COLUMN, don't reorder it. GitHub/Google/password logins
  all resolve through this table now (see technical guide §7.7).
- `20260830020000_translator_lookups` — `translator_lookups` (one row per `/translate`
  query: `query_text`, `match_key`, `region?`, `hit`). Feeds `translator_stats`,
  `translator_region_miss`, and the admin translator-miss log via the nightly
  `recompute-stats` worker job.

`system_settings` is a plain key/value (`key` PK, `value` jsonb). Known keys:
`maintenance_mode`, `paused_task_types`, `publication_comments_open`,
`adjudication_window_days`.

pg-boss creates its own `pgboss` schema on first `boss.start()` in `control-plane/worker`
— it is not a Prisma-managed schema and won't show up in `migrate status`.

Migration added 2026-09-06 (same offline `prisma migrate diff --from-schema-datamodel
<old> --to-schema-datamodel <new> --script` flow, purely additive):

- `20260906000000_marker_terms` — `marker_terms` (`list_version · term · active ·
  notes`, unique on `(term, list_version)`). This is the §12.3 "Tunisian-specific
  lexical markers" pre-filter list, mirroring `standardisation_rules`' version-bump
  pattern instead of a flat code-level array — a new `list_version` can be seeded
  and cut over without touching any deployed code. `loadActiveMarkerTerms` in
  `control-plane/backend/core/src/ingestion/marker-list.ts` reads the highest
  `list_version`'s active terms unless a specific version is pinned. Seed data lives
  in `db/seeds/marker-terms.data.ts` (run via `pnpm --filter @open-derja/db run
  seed:markers`) — a starting list per the technical ledger's own admission that
  "the actual thresholds and markers to move" once real data starts coming through,
  not an authoritative ruleset.