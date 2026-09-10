-- CreateTable
CREATE TABLE "marker_terms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "list_version" INTEGER NOT NULL,
    "term" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "marker_terms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marker_terms_list_version_idx" ON "marker_terms"("list_version");

-- CreateIndex
CREATE UNIQUE INDEX "marker_terms_term_list_version_key" ON "marker_terms"("term", "list_version");
