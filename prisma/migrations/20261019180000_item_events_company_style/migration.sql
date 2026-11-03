-- AlterTable
ALTER TABLE "item_events" ADD COLUMN "uuid" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "item_events" ALTER COLUMN "uuid" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "item_events_uuid_key" ON "item_events"("uuid");
