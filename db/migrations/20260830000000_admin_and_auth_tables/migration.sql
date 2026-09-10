-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('email_verify', 'password_reset');

-- CreateEnum
CREATE TYPE "RevocationScope" AS ENUM ('text', 'voice', 'full');

-- CreateEnum
CREATE TYPE "RevocationStatus" AS ENUM ('pending', 'processed', 'failed');

-- CreateEnum
CREATE TYPE "FeatureAudience" AS ENUM ('public', 'reviewer');

-- CreateTable
CREATE TABLE "email_otps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "email_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviewer_invites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "region" "Region" NOT NULL,
    "invited_by" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "accepted_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reviewer_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_revocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject_session_id" UUID,
    "subject_user_id" UUID,
    "scope" "RevocationScope" NOT NULL,
    "status" "RevocationStatus" NOT NULL DEFAULT 'pending',
    "requested_by" UUID,
    "processed_at" TIMESTAMPTZ(6),
    "scrubbed_count" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "consent_revocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "audience" "FeatureAudience" NOT NULL DEFAULT 'reviewer',
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "email_otps_user_id_purpose_idx" ON "email_otps"("user_id", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "reviewer_invites_token_hash_key" ON "reviewer_invites"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "reviewer_invites_accepted_user_id_key" ON "reviewer_invites"("accepted_user_id");

-- CreateIndex
CREATE INDEX "reviewer_invites_email_idx" ON "reviewer_invites"("email");

-- CreateIndex
CREATE INDEX "consent_revocations_status_idx" ON "consent_revocations"("status");

-- AddForeignKey
ALTER TABLE "email_otps" ADD CONSTRAINT "email_otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewer_invites" ADD CONSTRAINT "reviewer_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewer_invites" ADD CONSTRAINT "reviewer_invites_accepted_user_id_fkey" FOREIGN KEY ("accepted_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_revocations" ADD CONSTRAINT "consent_revocations_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_revocations" ADD CONSTRAINT "consent_revocations_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

