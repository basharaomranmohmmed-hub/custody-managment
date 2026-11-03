-- AlterTable
ALTER TABLE "departments"
ADD COLUMN "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN "created_by" INTEGER,
ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updated_at" TIMESTAMP(3),
ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "deleted_by" INTEGER;
ALTER TABLE "departments" ALTER COLUMN "uuid" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "departments_uuid_key" ON "departments"("uuid");
