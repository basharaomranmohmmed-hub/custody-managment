-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN "uuid" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "audit_logs" ALTER COLUMN "uuid" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "audit_logs_uuid_key" ON "audit_logs"("uuid");
