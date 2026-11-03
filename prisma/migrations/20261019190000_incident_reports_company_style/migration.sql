-- AlterTable
ALTER TABLE "incident_reports"
ADD COLUMN "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN "resolved_by" INTEGER,
ADD COLUMN "created_by" INTEGER,
ADD COLUMN "updated_at" TIMESTAMP(3),
ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "deleted_by" INTEGER;
ALTER TABLE "incident_reports" ALTER COLUMN "uuid" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "incident_reports_uuid_key" ON "incident_reports"("uuid");

-- CreateIndex
CREATE INDEX "incident_reports_resolved_by_idx" ON "incident_reports"("resolved_by");

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheck
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_resolver_only_when_resolved_check" CHECK (
    "status" = 'RESOLVED' OR "resolved_by" IS NULL
);
