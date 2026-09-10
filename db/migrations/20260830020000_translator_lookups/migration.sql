-- CreateTable
CREATE TABLE "translator_lookups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "query_text" TEXT NOT NULL,
    "match_key" TEXT NOT NULL,
    "region" "Region",
    "hit" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translator_lookups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "translator_lookups_created_at_idx" ON "translator_lookups"("created_at");

-- CreateIndex
CREATE INDEX "translator_lookups_hit_match_key_idx" ON "translator_lookups"("hit", "match_key");

-- CreateIndex
CREATE INDEX "translator_lookups_region_hit_idx" ON "translator_lookups"("region", "hit");

