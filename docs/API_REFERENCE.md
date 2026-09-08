# API reference — every backend endpoint, in one place

This is a working reference for anyone building the frontend (or any other client) against the
OpenDerja_TN backend. It lists every route that exists today, what it needs from you, and what you
get back. It's written to be readable by someone who isn't a backend developer — if you're building
a form or a page and need to know "what do I send, and what comes back," this should answer it
without you having to go read the NestJS source.

If this document and the code ever disagree, the code is right and this page is stale — that's worth
a pull request to fix, not something to work around silently.

## The short version

- **Base URL** in local development: `http://localhost:3000`. Every path below is relative to that.
- **Almost nothing requires an account.** Reading the corpus, searching, translating, and even
  contributing text are all open to anyone — see "How identity works" below.
- **Requests and responses are JSON**, except file uploads/downloads, which use presigned URLs (see
  the Storage section).
- **Validation is strict.** Send a field the server doesn't expect, or leave off `@` from an email, and
  you get a `400` with details — not a silent ignore.
- **Errors** come back as a normal NestJS error body: `{ "statusCode": ..., "message": ..., "error": ... }`.

## How identity works

This is the part that surprises people coming from a typical app, so it's worth explaining before the
endpoint list.

**You don't need an account to contribute, confirm, or even claim tasks.** The project is built around
letting anyone in Tunisia type a sentence and have it count, with no signup friction. Here's how that
actually works under the hood:

1. The first time you call `POST /corpus-items/contribute` (or a few other write endpoints), the
   server sets a random, long-lived, `httpOnly` cookie called `session_id`. You never read or set this
   yourself — the browser just carries it on every request automatically. That cookie is enough to
   attribute a contribution to "the same person" across visits, without ever collecting a name or email.
2. If you want that same anonymous visitor to be able to **claim and complete tasks** (which need a
   real login session, not just a cookie), call `POST /auth/guest-session`. It reads that same
   `session_id` cookie (or creates one if it doesn't exist yet) and hands back a real access token —
   same shape as a logged-in session, just tied to an anonymous identity instead of an email/password
   account. No name, email, or password involved.
3. A **registered account** (`POST /auth/register` + `POST /auth/login`, or GitHub/Google OAuth) is
   only needed for reviewer/admin roles, or if a contributor wants their work to follow them across
   devices instead of staying tied to one browser's cookie.

Either way, once you have an access token, send it as `Authorization: Bearer <token>` on every request
that needs one. Access tokens expire after 2 hours; `POST /auth/refresh` (using the separate,
`httpOnly` refresh cookie the login/guest-session response also sets) gets you a new one without
asking the user to log in again.

**Roles**, from least to most privileged: `contributor` → `trusted_contributor` → `reviewer` → `admin`
→ `superadmin`. A brand-new guest session or freshly registered account starts as `contributor`.
Trust level (0–3, separate from role) is computed automatically from someone's track record and
affects which task types they're eligible for — it's never something a client sets directly.

## Shared vocabulary (enums)

These value lists are used across many endpoints below — rather than repeating them every time, they're
listed once here. They live in `shared/src/enums/` if you need the canonical source.

| Enum | Values |
|---|---|
| Region | `northwest`, `north`, `sahel`, `south` — always a *set*, never a single pick (see [ARCHITECTURE.md](ARCHITECTURE.md)) |
| Scope | `pan_tunisian`, `regional` |
| Era | `contemporary`, `historical`, `unknown` |
| Setting | `urban`, `rural`, `unknown` |
| Register | `neutral`, `formal`, `vulgar`, `archaic`, `unknown` |
| Script | `arabic`, `arabizi`, `mixed`, `latin` |
| Corpus unit | `paragraph`, `sentence`, `phrase` |
| Tag kind | `scope`, `region`, `era`, `setting`, `register`, `code_switch`, `sense`, `quality` |
| Task type | `review`, `region_tag`, `confirm`, `translate_msa`, `translate_fr`, `translate_en`, `transliterate_to_arabic`, `transliterate_to_arabizi`, `standardise`, `adjudicate`, `link_lemma` |
| Task status | `open`, `claimed`, `done`, `rejected`, `needs_rework` |
| User role | `contributor`, `trusted_contributor`, `reviewer`, `admin`, `superadmin` |
| License | `cc_by_sa`, `cc_by_nc`, `research_use_only`, `public_domain`, `unknown` |
| Source kind | `youtube`, `forum`, `book`, `subtitle`, `contribution`, `elicitation`, `wikipedia`, `commoncrawl`, `tatoeba` |
| Origin layer | `arabic`, `arabic_derived`, `french`, `amazigh`, `italian`, `turkish`, `spanish`, `other`, `unknown` |
| Origin status | `proposed`, `confirmed`, `disputed` |
| Lexicon domain | `everyday`, `food`, `admin`, `agriculture`, `kinship`, `other` |
| Part of speech | `noun`, `verb`, `adj`, `particle` |
| Flag reason | `offensive`, `personal_data`, `wrong`, `copyright`, `other` |
| Flag status | `open`, `resolved`, `dismissed` |
| Correction status | `proposed`, `accepted`, `rejected` |
| Target language (translation) | `msa`, `fr`, `en` |
| Translation source | `llm_draft`, `human`, `corrected_llm` |
| Publication kind | `paper`, `thesis`, `corpus`, `tool`, `book` |
| Publication/comment status | `pending`, `approved`, `rejected` |

## Public endpoints — no login needed at all

Everything in this section can be called by a completely anonymous visitor with no cookie and no
token.

| Method & path | What it does |
|---|---|
| `GET /corpus-items` | Search/browse the corpus. Query params: `q` (free-text, plain substring match for now — not ranked search), `regions` (repeat the param for multiple), `scope`, `era`, `setting`, `register`, `script`, `unit`, `hasTranslation` (`true`/`false`), `page` (default 1), `pageSize` (default 20, max 100). Filters on region/scope/era/setting/register match against the *agreed* tag for that text, not any one person's opinion. Returns `{ items, total, page, pageSize }`, where each item is `{ id, text, unit, script, canonicalForm, createdAt }`. |
| `GET /corpus-items/:id` | One corpus item by id, with its full detail (annotations, translations, source). |
| `POST /corpus-items/contribute` | Submit a new piece of text. Body: `text` (required, 1–5000 chars), `selfReportedRegion` (optional, one Region), `selfReportedOrigin` (optional free text), `contributorName`/`contributorEmail` (both optional — leave them out to stay fully anonymous), `consentGiven` (**must be `true`** or the request is rejected), `consentVoice` (optional). If the text is a near-duplicate of something already in the corpus, you get back `{ duplicate: true, existingCorpusItemId, knownRegions }` instead of a new item — the UI should use that to ask "we've already got this — does your region say it differently?" rather than silently failing. |
| `GET /lexicon` | Search the lexicon. Query params: `q`, `limit`. |
| `GET /lexicon/:id` | One lexicon entry with all its regional variants, forms, and origins — this is also what powers a "compare across regions" view: group `variants[]` by `region` client-side. |
| `POST /lexicon/:id/origins` | Propose a word origin for a lexicon entry. Body: `origin` (an Origin layer), `sourceForm`/`sourceLang`/`note` (all optional). Works anonymously (attributed to your `session_id` cookie) or while logged in. |
| `GET /translate` | Look up a translation. Query params: `text` (required), `region` (optional — narrows to that region's usage), `includeVulgar` (optional, defaults to filtering out vulgar-register results). Every lookup is logged (anonymously) to help find gaps in coverage — a logging failure never breaks the lookup itself. |
| `GET /translate/coverage` | Aggregate stats on how much of common vocabulary the translator can actually answer. |
| `GET /contributors` | Leaderboard. Query params: `region` (optional), `limit` (default 50, max 200). Returns only display-safe fields — name, region, approved count, last-contributed date. Never exposes a session id or IP. |
| `GET /coverage` | Regional balance, per-unit breakdown, and translator hit-rate — the numbers behind a "how balanced is this corpus" page. |
| `GET /gaps` | What's most needed right now: regions under-represented (below 15% share) and terms people search for in the translator that don't have a match yet. |
| `GET /data` | List of published dataset snapshots (versioned releases) — version, item count, rule version, changelog notes, checksum, size. Only lists snapshots whose file actually finished uploading. |
| `GET /data/:id/download` | Returns `{ downloadUrl }` — a short-lived, presigned link to download that snapshot's file directly from storage. |
| `POST /corrections` | Propose a correction to an existing record without needing write access to it. Body: `targetTable`, `targetId` (UUID), `field`, `newValue`, `oldValue`/`reason` (optional). Works anonymously or logged in. |
| `POST /flags` | Report a problem with something (offensive content, personal data, factually wrong, copyright, other). Body: `targetType`, `targetId` (UUID), `reason` (a Flag reason), `note` (optional). |
| `GET /auth/oauth/:provider` / `GET /auth/oauth/:provider/callback` | Start and complete GitHub/Google OAuth login. `:provider` is `github` or `google`. |
| `POST /auth/register`, `POST /auth/login`, `POST /auth/guest-session`, `POST /auth/refresh`, `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm`, `POST /auth/accept-invite` | See "How identity works" above and the Auth section below. |

## Contributor endpoints — need a session (anonymous guest session is enough)

These need `Authorization: Bearer <token>`, but that token can come from either
`POST /auth/guest-session` (fully anonymous) or a real login — there's no meaningful difference in
what a plain `contributor` can do. `AllowUnverifiedEmail` is noted where it matters: it means you
don't need to have confirmed an email address to use that route (relevant for guest sessions, which
have none).

| Method & path | What it does |
|---|---|
| `POST /tasks/claim` | Ask for the next available task matching your role and trust level. Returns the task, or a `404` if nothing's available right now — the frontend should treat that as "nothing to do," not an error to show. |
| `POST /tasks/:id/complete` | Mark a claimed task done. Body: `outputRecordId` (optional UUID — the id of whatever record your work produced, if applicable). |
| `POST /tasks/:id/region-tag` | Submit a region-tagging task. Body: `regions` (1–4 unique Regions). |
| `POST /tasks/:id/confirm` | Submit a confirm/agreement task. Body: `agrees` (boolean), `regions` (optional, up to 4). |
| `POST /tasks/:id/translate` | Submit a translation task. Body: `text` (1–5000 chars). |
| `POST /tasks/:id/transliterate` | Submit a transliteration task. Body: `text` (1–500 chars), `lexiconVariantId` (UUID). |
| `POST /corpus-items/contribute`, `POST /lexicon/:id/origins`, `POST /corrections`, `POST /flags` | Same routes as the public section — work identically while logged in, just attributed to your account instead of a bare cookie. |

## Reviewer endpoints — need the `reviewer` role or above

| Method & path | What it does |
|---|---|
| `POST /tasks/:id/review` | Approve or reject a review task. Body: `approved` (boolean), `qualityValue`/`regions` (optional). |
| `POST /tasks/:id/standardise` | Submit the canonical (CODA-standardised) form for a standardisation task. Body: `canonicalForm`. |
| `POST /tasks/:id/link-lemma` | Link a token to a lexicon entry/variant. Body: `lexiconEntryId` (UUID), `lexiconVariantId` (optional UUID). |
| `POST /tasks/:id/adjudicate` | Make the final call on a disputed annotation. Body: `kind` (a Tag kind), `values` (at least one string). |
| `POST /tasks/:id/rework`, `POST /tasks/:id/reject` | Send a task back for rework, or reject it outright. No body. |
| `GET /corrections` | List proposed corrections. Query: `status` (a Correction status). |
| `POST /corrections/:id/accept`, `POST /corrections/:id/reject` | Resolve a proposed correction. |
| `GET /flags` | List reported flags. Query: `status` (a Flag status). |
| `POST /flags/:id/resolve`, `POST /flags/:id/dismiss` | Resolve a flag. |
| `POST /lexicon`, `POST /lexicon/:id/variants`, `POST /lexicon/variants/:variantId/regions`, `POST /lexicon/variants/:variantId/forms` | Create lexicon entries, regional variants, region attestations, and alternate-script forms. See the DTOs in the code for exact fields — these are editorial tools, not something a typical contributor calls directly. |
| `POST /storage/uploads`, `POST /storage/uploads/:id/confirm`, `GET /storage/uploads/:id/download` | The presigned-upload flow: ask for an upload URL, PUT your file to it directly (never through this backend), then confirm — the server re-checks the bucket itself rather than trusting your "done" signal. |

## Admin & superadmin endpoints

These exist for the moderation and operations dashboard, not for the public-facing app. Listed here
for completeness — if you're building an admin panel, read the corresponding `*.controller.ts` and
`*.service.ts` under `control-plane/backend/src/modules/admin/` for exact request/response shapes,
since these change more often and are lower-stakes to get slightly wrong from a docs-drift
perspective than the public/contributor surface above.

| Area | Base path | Needs |
|---|---|---|
| Overview dashboard | `GET /admin/overview` | admin |
| Users & contributors | `/admin/users/*` — list, promote, adjust trust, ban, invite reviewers, set role | admin (role-setting is superadmin) |
| Data management | `/admin/data/*` — browse tables, translator-miss log, bulk region reassignment, bulk-reject a scrape batch, merge lexicon concepts | admin (bulk ops are superadmin) |
| Review lanes | `/admin/review-lanes/*` — unified queue for corrections/origins/publications/flags, comment moderation | admin |
| Task administration | `/admin/tasks/*` — reprioritise, pause/resume a task type, force-release or reassign a claim | admin |
| Sources | `/admin/sources/*` — list, yield history, quarantine, trigger a scrape run | admin |
| Snapshots & releases | `/admin/snapshots/*` — create, diff, deprecate | superadmin |
| Privacy operations | `/admin/privacy/*` — consent revocation requests, scrub preview, subject access export | superadmin |
| System | `/admin/system/*` — job status, backup status, feature flags, maintenance mode, audit log | superadmin |
| Plain `sources`/`users` CRUD | `GET/POST/PATCH /sources`, `GET /users` | admin/superadmin |

## Auth — the full picture

| Method & path | Auth needed | What it does |
|---|---|---|
| `POST /auth/register` | none | Body: `email`, `password` (min 12 chars), `displayName` (optional). Creates a `contributor` account. |
| `POST /auth/login` | none | Body: `email`, `password`, `totpCode` (optional — only needed for admin/superadmin accounts with 2FA enabled). Returns an access token in the body and sets a refresh-token cookie. If the account needs 2FA and didn't send a code, the token you get back is a limited "pending" token — see the 2FA rows below. |
| `POST /auth/guest-session` | none | See "How identity works" above. |
| `POST /auth/refresh` | refresh cookie | Exchanges the `httpOnly` refresh cookie (plus a CSRF header check) for a new access token. |
| `POST /auth/logout` | any logged-in session | Invalidates the current refresh session and clears cookies. |
| `POST /auth/verify-email/request`, `POST /auth/verify-email/confirm` | any session, email need not be verified yet | Sends/confirms a 6-digit email verification code. |
| `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm` | none | Always responds the same way whether or not the email exists, so it can't be used to check who has an account. |
| `POST /auth/accept-invite` | none | Body: `token` (the invite token from the invite email), `password`/`displayName` (optional). Turns a reviewer invite into a real account. |
| `POST /auth/2fa/enroll`, `POST /auth/2fa/confirm`, `POST /auth/2fa/verify` | admin/superadmin only | The mandatory 2FA setup and login-completion flow for privileged accounts. `enroll` gives you a secret + QR-code URL, `confirm` finishes first-time setup, `verify` completes login on a later visit once already enrolled. |
| `GET /auth/oauth/:provider`, `GET /auth/oauth/:provider/callback` | none | `:provider` is `github` or `google`. Signing in with OAuth only grants a role if the account is already linked, matched by verified email, or covered by an open reviewer invite — a brand-new OAuth identity with none of those is rejected, not silently given an account. |

**On mutations** (anything that isn't a `GET`), the frontend needs to send the CSRF token back as an
`X-Csrf-Token` header, read from the (non-`httpOnly`, so JavaScript-readable) `csrf_token` cookie the
login/guest-session/refresh response sets. This is a standard double-submit-cookie check, not
something specific to any one endpoint.

## Where to go next

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — the bigger picture this API sits inside.
- [`../db/DATABASE_NOTES.md`](../db/DATABASE_NOTES.md) — why the data model looks the way it does.
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — how to actually send a change.
