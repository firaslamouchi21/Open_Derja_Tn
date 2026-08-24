
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

Contribution Source: Add a contribution kind row in sources for user submissions.

Rules: Seed baseline CODA-TUN standardisation_rules.