-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('HANDOVER_RECEIPT', 'RETURN_RECEIPT', 'CLEARANCE', 'OTHER');

-- AlterEnum
ALTER TYPE "audit_action" ADD VALUE 'DELETE';

-- AlterEnum
ALTER TYPE "audit_entity_type" ADD VALUE 'DOCUMENT';

-- AlterTable
ALTER TABLE "item_events" ADD COLUMN     "document_id" INTEGER;

-- CreateTable
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "doc_no" TEXT NOT NULL,
    "doc_type" "document_type" NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_doc_no_key" ON "documents"("doc_no");

-- CreateIndex
CREATE UNIQUE INDEX "documents_storage_key_key" ON "documents"("storage_key");

-- CreateIndex
CREATE INDEX "documents_employee_id_idx" ON "documents"("employee_id");

-- CreateIndex
CREATE INDEX "documents_doc_type_idx" ON "documents"("doc_type");

-- CreateIndex
CREATE INDEX "documents_issued_at_idx" ON "documents"("issued_at");

-- CreateIndex
CREATE INDEX "item_events_document_id_idx" ON "item_events"("document_id");

-- AddForeignKey
ALTER TABLE "item_events" ADD CONSTRAINT "item_events_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "documents" ADD CONSTRAINT "documents_size_bytes_positive_check" CHECK ("size_bytes" > 0);

ALTER TABLE "item_events" ADD CONSTRAINT "item_events_document_event_type_check" CHECK (
    "document_id" IS NULL OR "event_type" IN ('HANDOVER', 'RETURN')
);
