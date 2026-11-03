-- AlterTable
ALTER TABLE "item_events" ADD COLUMN     "performed_by" INTEGER;

-- CreateIndex
CREATE INDEX "item_events_performed_by_idx" ON "item_events"("performed_by");

-- AddForeignKey
ALTER TABLE "item_events" ADD CONSTRAINT "item_events_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE "item_events" e
SET "performed_by" = a."user_id"
FROM "possessions" p
JOIN "audit_logs" a
    ON a."entity_type" = 'POSSESSION'
    AND a."entity_id" = p."id"
    AND a."action" = 'HANDOVER'
    AND a."outcome" = 'SUCCESS'
WHERE e."event_type" = 'HANDOVER'
    AND p."start_event_id" = e."id";

UPDATE "item_events" e
SET "performed_by" = a."user_id"
FROM "possessions" p
JOIN "audit_logs" a
    ON a."entity_type" = 'POSSESSION'
    AND a."entity_id" = p."id"
    AND a."action" = 'RETURN'
    AND a."outcome" = 'SUCCESS'
WHERE e."event_type" = 'RETURN'
    AND p."end_event_id" = e."id";

WITH status_events AS (
    SELECT "id", "item_id",
        ROW_NUMBER() OVER (PARTITION BY "item_id" ORDER BY "id") AS "position",
        COUNT(*) OVER (PARTITION BY "item_id") AS "total"
    FROM "item_events"
    WHERE "event_type" = 'STATUS_CHANGE'
),
status_audits AS (
    SELECT "user_id", "entity_id" AS "item_id",
        ROW_NUMBER() OVER (PARTITION BY "entity_id" ORDER BY "id") AS "position",
        COUNT(*) OVER (PARTITION BY "entity_id") AS "total"
    FROM "audit_logs"
    WHERE "entity_type" = 'ITEM' AND "action" = 'STATUS_CHANGE' AND "outcome" = 'SUCCESS'
)
UPDATE "item_events" e
SET "performed_by" = status_audits."user_id"
FROM status_events
JOIN status_audits
    ON status_audits."item_id" = status_events."item_id"
    AND status_audits."position" = status_events."position"
    AND status_audits."total" = status_events."total"
WHERE e."id" = status_events."id";
