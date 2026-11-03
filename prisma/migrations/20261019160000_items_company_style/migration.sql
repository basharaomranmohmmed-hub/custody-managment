-- DropForeignKey
ALTER TABLE "items" DROP CONSTRAINT "items_type_id_fkey";

-- RenameColumn
ALTER TABLE "items" RENAME COLUMN "type_id" TO "custody_type_id";

-- RenameIndex
ALTER INDEX "items_type_id_idx" RENAME TO "items_custody_type_id_idx";

-- AlterTable
ALTER TABLE "items"
ADD COLUMN "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN "created_by" INTEGER,
ADD COLUMN "updated_at" TIMESTAMP(3),
ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "deleted_by" INTEGER;
ALTER TABLE "items" ALTER COLUMN "uuid" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "items_uuid_key" ON "items"("uuid");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_custody_type_id_fkey" FOREIGN KEY ("custody_type_id") REFERENCES "custody_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
