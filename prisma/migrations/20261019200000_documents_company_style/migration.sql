-- AlterTable
ALTER TABLE "documents"
ADD COLUMN "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN "created_by" INTEGER,
ADD COLUMN "updated_at" TIMESTAMP(3),
ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "deleted_by" INTEGER;
ALTER TABLE "documents" ALTER COLUMN "uuid" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "documents_uuid_key" ON "documents"("uuid");

-- CreateIndex
CREATE INDEX "documents_created_by_idx" ON "documents"("created_by");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
