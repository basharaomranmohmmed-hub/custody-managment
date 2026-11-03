-- AlterTable
ALTER TABLE "custody_types"
ADD COLUMN "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN "created_by" INTEGER,
ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updated_at" TIMESTAMP(3),
ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "deleted_by" INTEGER;
ALTER TABLE "custody_types" ALTER COLUMN "uuid" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "custody_types_uuid_key" ON "custody_types"("uuid");
