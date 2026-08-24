CREATE TYPE "DatasetSplit" AS ENUM ('train', 'dev', 'test');

CREATE TYPE "RightsStatus" AS ENUM ('granted', 'revoked', 'not_applicable');

ALTER TABLE "corpus_items" DROP COLUMN "split",
ADD COLUMN "dataset_split" "DatasetSplit" NOT NULL;

ALTER TABLE "documents" DROP COLUMN "consent_status",
ADD COLUMN "rights_status" "RightsStatus" NOT NULL DEFAULT 'not_applicable';

ALTER TABLE "tasks" DROP COLUMN "result_ref",
DROP COLUMN "slot",
ADD COLUMN "idempotency_slot" TEXT NOT NULL DEFAULT '',
ADD COLUMN "output_record_id" UUID;

DROP TYPE "ConsentStatus";

DROP TYPE "Split";
