-- CreateEnum
CREATE TYPE "incident_report_type" AS ENUM ('LOSS', 'DAMAGE', 'THEFT', 'MALFUNCTION');

-- CreateEnum
CREATE TYPE "incident_report_status" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "incident_reports" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "report_type" "incident_report_type" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "incident_report_status" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "incident_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incident_reports_item_id_idx" ON "incident_reports"("item_id");

-- CreateIndex
CREATE INDEX "incident_reports_employee_id_idx" ON "incident_reports"("employee_id");

-- CreateIndex
CREATE INDEX "incident_reports_status_idx" ON "incident_reports"("status");

-- CreateIndex
CREATE INDEX "incident_reports_report_type_idx" ON "incident_reports"("report_type");

-- CreateIndex
CREATE INDEX "incident_reports_created_at_idx" ON "incident_reports"("created_at");

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_resolution_consistent_check" CHECK (
    ("status" = 'OPEN' AND "resolution" IS NULL AND "resolved_at" IS NULL)
    OR ("status" = 'RESOLVED' AND "resolution" IS NOT NULL AND "resolved_at" IS NOT NULL)
);
