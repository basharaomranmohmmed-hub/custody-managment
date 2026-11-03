-- AlterTable
ALTER TABLE "possessions"
ADD COLUMN "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN "created_by" INTEGER,
ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updated_at" TIMESTAMP(3);
ALTER TABLE "possessions" ALTER COLUMN "uuid" DROP DEFAULT;

-- Backfill
UPDATE "possessions" AS p
SET "created_at" = e."recorded_at",
    "created_by" = e."performed_by"
FROM "item_events" AS e
WHERE e."id" = p."start_event_id";

-- CreateIndex
CREATE UNIQUE INDEX "possessions_uuid_key" ON "possessions"("uuid");
