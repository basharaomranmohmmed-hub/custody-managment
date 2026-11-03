-- AlterTable
ALTER TABLE "documents" ADD COLUMN "issued_by" INTEGER;

UPDATE "documents" SET "issued_by" = "created_by";

-- CreateIndex
CREATE INDEX "documents_issued_by_idx" ON "documents"("issued_by");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
