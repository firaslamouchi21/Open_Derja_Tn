-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('password', 'google', 'github');

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_identities_user_id_idx" ON "auth_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_provider_user_id_key" ON "auth_identities"("provider", "provider_user_id");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing GitHub identities before dropping the column
INSERT INTO "auth_identities" ("user_id", "provider", "provider_user_id", "email", "updated_at")
SELECT "id", 'github', "github_id", "email", CURRENT_TIMESTAMP
FROM "users"
WHERE "github_id" IS NOT NULL;

-- DropIndex
DROP INDEX "users_github_id_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "github_id";
