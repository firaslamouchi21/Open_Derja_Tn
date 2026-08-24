-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "Scope" AS ENUM ('pan_tunisian', 'regional');

-- CreateEnum
CREATE TYPE "Region" AS ENUM ('northwest', 'north', 'sahel', 'south');

-- CreateEnum
CREATE TYPE "Era" AS ENUM ('contemporary', 'historical');

-- CreateEnum
CREATE TYPE "Setting" AS ENUM ('urban', 'rural', 'unknown');

-- CreateEnum
CREATE TYPE "Register" AS ENUM ('neutral', 'formal', 'vulgar', 'archaic');

-- CreateEnum
CREATE TYPE "CorpusUnit" AS ENUM ('paragraph', 'sentence', 'phrase');

-- CreateEnum
CREATE TYPE "Script" AS ENUM ('arabic', 'arabizi', 'mixed', 'latin');

-- CreateEnum
CREATE TYPE "Split" AS ENUM ('train', 'dev', 'test');

-- CreateEnum
CREATE TYPE "TagKind" AS ENUM ('scope', 'region', 'era', 'setting', 'register', 'code_switch', 'sense', 'quality');

-- CreateEnum
CREATE TYPE "Domain" AS ENUM ('everyday', 'food', 'admin', 'agriculture', 'kinship', 'other');

-- CreateEnum
CREATE TYPE "Granularity" AS ENUM ('word', 'phrase', 'sentence');

-- CreateEnum
CREATE TYPE "PartOfSpeech" AS ENUM ('noun', 'verb', 'adj', 'particle');

-- CreateEnum
CREATE TYPE "OriginLayer" AS ENUM ('arabic', 'arabic_derived', 'french', 'amazigh', 'italian', 'turkish', 'spanish', 'other', 'unknown');

-- CreateEnum
CREATE TYPE "OriginStatus" AS ENUM ('proposed', 'confirmed', 'disputed');

-- CreateEnum
CREATE TYPE "TargetLang" AS ENUM ('msa', 'fr', 'en');

-- CreateEnum
CREATE TYPE "TranslationSource" AS ENUM ('llm_draft', 'human', 'corrected_llm');

-- CreateEnum
CREATE TYPE "License" AS ENUM ('cc_by_sa', 'cc_by_nc', 'research_use_only', 'public_domain', 'unknown');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('granted', 'revoked', 'not_applicable');

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('youtube', 'forum', 'book', 'subtitle', 'contribution', 'elicitation', 'wikipedia', 'commoncrawl', 'tatoeba');

-- CreateEnum
CREATE TYPE "CorrectionStatus" AS ENUM ('proposed', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "FlagReason" AS ENUM ('offensive', 'personal_data', 'wrong', 'copyright', 'other');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('open', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('contributor', 'trusted_contributor', 'reviewer', 'admin', 'superadmin');

-- CreateEnum
CREATE TYPE "TaskRole" AS ENUM ('contributor', 'reviewer', 'admin');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('review', 'region_tag', 'confirm', 'translate_msa', 'translate_fr', 'translate_en', 'transliterate_to_arabic', 'transliterate_to_arabizi', 'standardise', 'adjudicate', 'link_lemma');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('open', 'claimed', 'done', 'rejected', 'needs_rework');

-- CreateEnum
CREATE TYPE "PublicationKind" AS ENUM ('paper', 'thesis', 'corpus', 'tool', 'book');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('pending', 'processing', 'sent', 'failed', 'failed_permanent');

-- CreateEnum
CREATE TYPE "ConsentScope" AS ENUM ('text_only', 'includes_voice');

-- CreateEnum
CREATE TYPE "StoredObjectKind" AS ENUM ('voice_clip', 'dataset_snapshot', 'db_backup', 'book_scan', 'other');

-- CreateEnum
CREATE TYPE "StoredObjectStatus" AS ENUM ('pending', 'stored', 'deleted');

-- CreateTable
CREATE TABLE "sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "SourceKind" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "license_default" "License" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMPTZ(6),
    "rate_limit" INTEGER,
    "proxy_pool" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_id" UUID NOT NULL,
    "external_ref" TEXT,
    "title" TEXT,
    "raw_body" TEXT NOT NULL,
    "region_hint" "Region",
    "era_hint" "Era",
    "license" "License" NOT NULL,
    "consent_status" "ConsentStatus" NOT NULL DEFAULT 'not_applicable',
    "ingested_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corpus_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "parent_id" UUID,
    "unit" "CorpusUnit" NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "script" "Script" NOT NULL,
    "canonical_form" TEXT,
    "canonical_map" JSONB,
    "match_key" TEXT,
    "rule_version" INTEGER,
    "char_offset" INTEGER NOT NULL,
    "split" "Split" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "corpus_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "corpus_item_id" UUID NOT NULL,
    "char_start" INTEGER NOT NULL,
    "char_end" INTEGER NOT NULL,
    "surface_text" TEXT NOT NULL,
    "annotator_id" UUID NOT NULL,
    "is_machine" BOOLEAN NOT NULL,
    "confidence" DECIMAL(3,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token_id" UUID NOT NULL,
    "lexicon_entry_id" UUID NOT NULL,
    "lexicon_variant_id" UUID,
    "annotator_id" UUID NOT NULL,
    "is_machine" BOOLEAN NOT NULL,
    "confidence" DECIMAL(3,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "corpus_item_id" UUID NOT NULL,
    "char_start" INTEGER NOT NULL,
    "char_end" INTEGER NOT NULL,
    "kind" "TagKind" NOT NULL,
    "value" TEXT NOT NULL,
    "annotator_id" UUID NOT NULL,
    "is_machine" BOOLEAN NOT NULL,
    "confidence" DECIMAL(3,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_consensus" (
    "corpus_item_id" UUID NOT NULL,
    "kind" "TagKind" NOT NULL,
    "char_start" INTEGER NOT NULL,
    "char_end" INTEGER NOT NULL,
    "agreed_values" TEXT[],
    "agreement" DECIMAL(3,2) NOT NULL,
    "annotator_n" INTEGER NOT NULL,
    "needs_adjudication" BOOLEAN NOT NULL,
    "computed_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tag_consensus_pkey" PRIMARY KEY ("corpus_item_id","kind","char_start","char_end")
);

-- CreateTable
CREATE TABLE "lexicon_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gloss_en" TEXT,
    "gloss_fr" TEXT,
    "gloss_msa" TEXT,
    "domain" "Domain",
    "granularity" "Granularity" NOT NULL,
    "pos" "PartOfSpeech",
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lexicon_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lexicon_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lexicon_entry_id" UUID NOT NULL,
    "scope" "Scope" NOT NULL,
    "era" "Era" NOT NULL,
    "setting" "Setting" NOT NULL,
    "register" "Register" NOT NULL,
    "canonical_form" TEXT NOT NULL,
    "match_key" TEXT NOT NULL,
    "confidence" DECIMAL(3,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lexicon_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lexicon_variant_regions" (
    "lexicon_variant_id" UUID NOT NULL,
    "region" "Region" NOT NULL,
    "attestation_count" INTEGER NOT NULL DEFAULT 0,
    "confidence" DECIMAL(3,2),

    CONSTRAINT "lexicon_variant_regions_pkey" PRIMARY KEY ("lexicon_variant_id","region")
);

-- CreateTable
CREATE TABLE "lexicon_forms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lexicon_variant_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "script" "Script" NOT NULL,
    "match_key" TEXT NOT NULL,
    "is_canonical" BOOLEAN NOT NULL DEFAULT false,
    "frequency" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lexicon_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lexicon_origins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lexicon_entry_id" UUID NOT NULL,
    "origin" "OriginLayer" NOT NULL,
    "source_form" TEXT,
    "source_lang" TEXT,
    "note" TEXT,
    "proposed_by" UUID,
    "session_id" UUID,
    "ip_hash" TEXT,
    "status" "OriginStatus" NOT NULL DEFAULT 'proposed',
    "confidence" DECIMAL(3,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lexicon_origins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "corpus_item_id" UUID,
    "lexicon_entry_id" UUID,
    "lexicon_variant_id" UUID,
    "target_lang" "TargetLang" NOT NULL,
    "text" TEXT NOT NULL,
    "source" "TranslationSource" NOT NULL,
    "translator_id" UUID,
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "quality_score" DECIMAL(3,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_meta" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "corpus_item_id" UUID NOT NULL,
    "contributor_name" TEXT,
    "contributor_email" TEXT,
    "self_reported_region" "Region",
    "self_reported_origin" TEXT,
    "session_id" UUID,
    "ip_hash" TEXT,
    "consent_given" BOOLEAN NOT NULL,
    "consent_voice" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "submission_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "target_table" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "field" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "reason" TEXT,
    "proposed_by" UUID,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'proposed',
    "reviewed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "target_type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" "FlagReason" NOT NULL,
    "note" TEXT,
    "session_id" UUID,
    "ip_hash" TEXT,
    "status" "FlagStatus" NOT NULL DEFAULT 'open',
    "resolved_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role" "UserRole" NOT NULL,
    "display_name" TEXT,
    "email" TEXT,
    "password_hash" TEXT,
    "trust_level" INTEGER NOT NULL DEFAULT 0,
    "region_self_reported" "Region",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "email_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "github_id" TEXT,
    "totp_secret" TEXT,
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "jti" TEXT NOT NULL,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "diff" JSONB NOT NULL,
    "ip_hash" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "corpus_item_id" UUID NOT NULL,
    "type" "TaskType" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'open',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "claimed_by" UUID,
    "claimed_at" TIMESTAMPTZ(6),
    "completed_by" UUID,
    "completed_at" TIMESTAMPTZ(6),
    "result_ref" UUID,
    "requires_role" "TaskRole" NOT NULL,
    "target_regions" "Region"[],
    "item_version" INTEGER NOT NULL,
    "slot" TEXT NOT NULL DEFAULT '',
    "idem_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standardisation_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rule_version" INTEGER NOT NULL,
    "pattern" TEXT NOT NULL,
    "replacement" TEXT NOT NULL,
    "script" "Script" NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "standardisation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version" TEXT NOT NULL,
    "corpus_item_count" INTEGER NOT NULL,
    "stored_object_id" UUID NOT NULL,
    "rule_version" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dataset_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "snapshot_id" UUID NOT NULL,
    "metrics" JSONB NOT NULL,
    "trained_at" TIMESTAMPTZ(6) NOT NULL,
    "is_production" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "authors" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "venue" TEXT,
    "doi" TEXT,
    "url" TEXT,
    "kind" "PublicationKind" NOT NULL,
    "abstract" TEXT,
    "submitted_by" UUID,
    "status" "PublicationStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "publication_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "author_name" TEXT,
    "session_id" UUID,
    "ip_hash" TEXT,
    "status" "CommentStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "publication_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contributor_stats" (
    "session_id" UUID NOT NULL,
    "contributor_name" TEXT,
    "region" "Region",
    "approved_count" INTEGER NOT NULL DEFAULT 0,
    "submitted_count" INTEGER NOT NULL DEFAULT 0,
    "rejected_count" INTEGER NOT NULL DEFAULT 0,
    "last_contributed_at" TIMESTAMPTZ(6) NOT NULL,
    "computed_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "contributor_stats_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "region_stats" (
    "region" "Region" NOT NULL,
    "corpus_item_count" INTEGER NOT NULL DEFAULT 0,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "translation_count" INTEGER NOT NULL DEFAULT 0,
    "reviewer_count" INTEGER NOT NULL DEFAULT 0,
    "out_of_region_adjudication_rate" DECIMAL(3,2),
    "computed_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "region_stats_pkey" PRIMARY KEY ("region")
);

-- CreateTable
CREATE TABLE "translator_stats" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "sentence_count" INTEGER NOT NULL DEFAULT 0,
    "hit_rate" DECIMAL(3,2),
    "computed_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "translator_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translator_region_miss" (
    "region" "Region" NOT NULL,
    "miss_rate" DECIMAL(3,2) NOT NULL,
    "computed_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "translator_region_miss_pkey" PRIMARY KEY ("region")
);

-- CreateTable
CREATE TABLE "speakers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID,
    "region_origin" "Region",
    "region_residence" "Region",
    "age_band" TEXT,
    "consent_voice" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "speakers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lexicon_variant_id" UUID NOT NULL,
    "lexicon_form_id" UUID,
    "speaker_id" UUID NOT NULL,
    "stored_object_id" UUID NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "sample_rate" INTEGER NOT NULL,
    "consent_scope" "ConsentScope" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stored_objects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "StoredObjectKind" NOT NULL,
    "bucket" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" BIGINT,
    "checksum" TEXT,
    "status" "StoredObjectStatus" NOT NULL DEFAULT 'pending',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ(6),
    "uploaded_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "stored_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "database_backups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stored_object_id" UUID NOT NULL,
    "encrypted" BOOLEAN NOT NULL DEFAULT true,
    "restore_tested_at" TIMESTAMPTZ(6),
    "restore_ok" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "database_backups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_source_id_idx" ON "documents"("source_id");

-- CreateIndex
CREATE INDEX "corpus_items_document_id_unit_position_idx" ON "corpus_items"("document_id", "unit", "position");

-- CreateIndex
CREATE INDEX "corpus_items_parent_id_idx" ON "corpus_items"("parent_id");

-- CreateIndex
CREATE INDEX "tokens_corpus_item_id_idx" ON "tokens"("corpus_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "links_token_id_key" ON "links"("token_id");

-- CreateIndex
CREATE INDEX "links_lexicon_entry_id_idx" ON "links"("lexicon_entry_id");

-- CreateIndex
CREATE INDEX "links_lexicon_variant_id_idx" ON "links"("lexicon_variant_id");

-- CreateIndex
CREATE INDEX "tags_corpus_item_id_kind_char_start_char_end_idx" ON "tags"("corpus_item_id", "kind", "char_start", "char_end");

-- CreateIndex
CREATE INDEX "tags_annotator_id_idx" ON "tags"("annotator_id");

-- CreateIndex
CREATE INDEX "tag_consensus_needs_adjudication_idx" ON "tag_consensus"("needs_adjudication");

-- CreateIndex
CREATE INDEX "lexicon_variant_regions_region_attestation_count_idx" ON "lexicon_variant_regions"("region", "attestation_count" DESC);

-- CreateIndex
CREATE INDEX "lexicon_forms_lexicon_variant_id_script_idx" ON "lexicon_forms"("lexicon_variant_id", "script");

-- CreateIndex
CREATE INDEX "lexicon_origins_lexicon_entry_id_idx" ON "lexicon_origins"("lexicon_entry_id");

-- CreateIndex
CREATE INDEX "lexicon_origins_origin_idx" ON "lexicon_origins"("origin");

-- CreateIndex
CREATE INDEX "translations_corpus_item_id_target_lang_idx" ON "translations"("corpus_item_id", "target_lang");

-- CreateIndex
CREATE INDEX "translations_lexicon_entry_id_target_lang_idx" ON "translations"("lexicon_entry_id", "target_lang");

-- CreateIndex
CREATE INDEX "translations_lexicon_variant_id_target_lang_idx" ON "translations"("lexicon_variant_id", "target_lang");

-- CreateIndex
CREATE UNIQUE INDEX "submission_meta_corpus_item_id_key" ON "submission_meta"("corpus_item_id");

-- CreateIndex
CREATE INDEX "corrections_target_table_target_id_idx" ON "corrections"("target_table", "target_id");

-- CreateIndex
CREATE INDEX "flags_target_type_target_id_idx" ON "flags"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_github_id_key" ON "users"("github_id");

-- CreateIndex
CREATE INDEX "users_role_region_self_reported_idx" ON "users"("role", "region_self_reported");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_sessions_jti_key" ON "refresh_sessions"("jti");

-- CreateIndex
CREATE INDEX "refresh_sessions_user_id_idx" ON "refresh_sessions"("user_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log"("actor_id");

-- CreateIndex
CREATE INDEX "tasks_status_type_priority_idx" ON "tasks"("status", "type", "priority" DESC);

-- CreateIndex
CREATE INDEX "tasks_claimed_by_status_idx" ON "tasks"("claimed_by", "status");

-- CreateIndex
CREATE INDEX "tasks_corpus_item_id_idx" ON "tasks"("corpus_item_id");

-- CreateIndex
CREATE INDEX "tasks_idem_key_idx" ON "tasks"("idem_key");

-- CreateIndex
CREATE INDEX "tasks_target_regions_idx" ON "tasks" USING GIN ("target_regions");

-- CreateIndex
CREATE INDEX "standardisation_rules_rule_version_idx" ON "standardisation_rules"("rule_version");

-- CreateIndex
CREATE UNIQUE INDEX "dataset_snapshots_stored_object_id_key" ON "dataset_snapshots"("stored_object_id");

-- CreateIndex
CREATE UNIQUE INDEX "publications_doi_key" ON "publications"("doi");

-- CreateIndex
CREATE INDEX "publication_comments_publication_id_idx" ON "publication_comments"("publication_id");

-- CreateIndex
CREATE INDEX "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");

-- CreateIndex
CREATE INDEX "contributor_stats_approved_count_idx" ON "contributor_stats"("approved_count" DESC);

-- CreateIndex
CREATE INDEX "contributor_stats_region_approved_count_idx" ON "contributor_stats"("region", "approved_count" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "media_stored_object_id_key" ON "media"("stored_object_id");

-- CreateIndex
CREATE INDEX "media_lexicon_variant_id_idx" ON "media"("lexicon_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "stored_objects_storage_key_key" ON "stored_objects"("storage_key");

-- CreateIndex
CREATE INDEX "stored_objects_kind_status_idx" ON "stored_objects"("kind", "status");

-- CreateIndex
CREATE INDEX "stored_objects_expires_at_idx" ON "stored_objects"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "database_backups_stored_object_id_key" ON "database_backups"("stored_object_id");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corpus_items" ADD CONSTRAINT "corpus_items_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corpus_items" ADD CONSTRAINT "corpus_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "corpus_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_corpus_item_id_fkey" FOREIGN KEY ("corpus_item_id") REFERENCES "corpus_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_annotator_id_fkey" FOREIGN KEY ("annotator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_lexicon_entry_id_fkey" FOREIGN KEY ("lexicon_entry_id") REFERENCES "lexicon_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_lexicon_variant_id_fkey" FOREIGN KEY ("lexicon_variant_id") REFERENCES "lexicon_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_annotator_id_fkey" FOREIGN KEY ("annotator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_corpus_item_id_fkey" FOREIGN KEY ("corpus_item_id") REFERENCES "corpus_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_annotator_id_fkey" FOREIGN KEY ("annotator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_consensus" ADD CONSTRAINT "tag_consensus_corpus_item_id_fkey" FOREIGN KEY ("corpus_item_id") REFERENCES "corpus_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lexicon_variants" ADD CONSTRAINT "lexicon_variants_lexicon_entry_id_fkey" FOREIGN KEY ("lexicon_entry_id") REFERENCES "lexicon_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lexicon_variant_regions" ADD CONSTRAINT "lexicon_variant_regions_lexicon_variant_id_fkey" FOREIGN KEY ("lexicon_variant_id") REFERENCES "lexicon_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lexicon_forms" ADD CONSTRAINT "lexicon_forms_lexicon_variant_id_fkey" FOREIGN KEY ("lexicon_variant_id") REFERENCES "lexicon_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lexicon_origins" ADD CONSTRAINT "lexicon_origins_lexicon_entry_id_fkey" FOREIGN KEY ("lexicon_entry_id") REFERENCES "lexicon_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lexicon_origins" ADD CONSTRAINT "lexicon_origins_proposed_by_fkey" FOREIGN KEY ("proposed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_corpus_item_id_fkey" FOREIGN KEY ("corpus_item_id") REFERENCES "corpus_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_lexicon_entry_id_fkey" FOREIGN KEY ("lexicon_entry_id") REFERENCES "lexicon_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_lexicon_variant_id_fkey" FOREIGN KEY ("lexicon_variant_id") REFERENCES "lexicon_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_translator_id_fkey" FOREIGN KEY ("translator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_meta" ADD CONSTRAINT "submission_meta_corpus_item_id_fkey" FOREIGN KEY ("corpus_item_id") REFERENCES "corpus_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrections" ADD CONSTRAINT "corrections_proposed_by_fkey" FOREIGN KEY ("proposed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrections" ADD CONSTRAINT "corrections_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flags" ADD CONSTRAINT "flags_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_corpus_item_id_fkey" FOREIGN KEY ("corpus_item_id") REFERENCES "corpus_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_claimed_by_fkey" FOREIGN KEY ("claimed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_snapshots" ADD CONSTRAINT "dataset_snapshots_stored_object_id_fkey" FOREIGN KEY ("stored_object_id") REFERENCES "stored_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_versions" ADD CONSTRAINT "model_versions_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "dataset_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_comments" ADD CONSTRAINT "publication_comments_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_lexicon_variant_id_fkey" FOREIGN KEY ("lexicon_variant_id") REFERENCES "lexicon_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_lexicon_form_id_fkey" FOREIGN KEY ("lexicon_form_id") REFERENCES "lexicon_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_speaker_id_fkey" FOREIGN KEY ("speaker_id") REFERENCES "speakers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_stored_object_id_fkey" FOREIGN KEY ("stored_object_id") REFERENCES "stored_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_objects" ADD CONSTRAINT "stored_objects_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "database_backups" ADD CONSTRAINT "database_backups_stored_object_id_fkey" FOREIGN KEY ("stored_object_id") REFERENCES "stored_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE UNIQUE INDEX tasks_idem_key_live_unique
  ON tasks (idem_key)
  WHERE status IN ('open', 'claimed', 'needs_rework');

ALTER TABLE translations
  ADD CONSTRAINT single_translation_target CHECK (
    (corpus_item_id IS NOT NULL)::int
    + (lexicon_entry_id IS NOT NULL)::int
    + (lexicon_variant_id IS NOT NULL)::int = 1
  );

CREATE UNIQUE INDEX translations_corpus_item_preferred_unique
  ON translations (corpus_item_id, target_lang)
  WHERE is_preferred AND corpus_item_id IS NOT NULL;

CREATE UNIQUE INDEX translations_lexicon_entry_preferred_unique
  ON translations (lexicon_entry_id, target_lang)
  WHERE is_preferred AND lexicon_entry_id IS NOT NULL;

CREATE UNIQUE INDEX translations_lexicon_variant_preferred_unique
  ON translations (lexicon_variant_id, target_lang)
  WHERE is_preferred AND lexicon_variant_id IS NOT NULL;

CREATE UNIQUE INDEX lexicon_forms_variant_canonical_unique
  ON lexicon_forms (lexicon_variant_id, script)
  WHERE is_canonical;

CREATE INDEX corpus_items_match_key_trgm
  ON corpus_items USING gin (match_key gin_trgm_ops);

CREATE INDEX lexicon_variants_match_key_trgm
  ON lexicon_variants USING gin (match_key gin_trgm_ops);

CREATE INDEX lexicon_forms_match_key_trgm
  ON lexicon_forms USING gin (match_key gin_trgm_ops);

ALTER TABLE tags
  ADD CONSTRAINT tags_value_matches_kind CHECK (
    (kind <> 'scope' OR value IN ('pan_tunisian', 'regional'))
    AND (kind <> 'region' OR value IN ('northwest', 'north', 'sahel', 'south'))
    AND (kind <> 'era' OR value IN ('contemporary', 'historical'))
    AND (kind <> 'setting' OR value IN ('urban', 'rural', 'unknown'))
    AND (kind <> 'register' OR value IN ('neutral', 'formal', 'vulgar', 'archaic'))
  );
