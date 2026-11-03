-- AlterTable
ALTER TABLE "item_events" ADD COLUMN     "report_id" INTEGER;

-- CreateIndex
CREATE INDEX "item_events_report_id_idx" ON "item_events"("report_id");

-- AddForeignKey
ALTER TABLE "item_events" ADD CONSTRAINT "item_events_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "incident_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
