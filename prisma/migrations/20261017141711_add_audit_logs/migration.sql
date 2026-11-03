-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('CREATE', 'UPDATE', 'STATUS_CHANGE', 'HANDOVER', 'RETURN', 'RESOLVE');

-- CreateEnum
CREATE TYPE "audit_entity_type" AS ENUM ('DEPARTMENT', 'EMPLOYEE', 'CUSTODY_TYPE', 'ITEM', 'POSSESSION', 'INCIDENT_REPORT');

-- CreateEnum
CREATE TYPE "audit_outcome" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "action" "audit_action" NOT NULL,
    "entity_type" "audit_entity_type" NOT NULL,
    "entity_id" INTEGER,
    "old_values" JSONB,
    "new_values" JSONB,
    "outcome" "audit_outcome" NOT NULL,
    "error_code" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_outcome_idx" ON "audit_logs"("outcome");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_outcome_consistent_check" CHECK (
    ("outcome" = 'SUCCESS' AND "entity_id" IS NOT NULL AND "error_code" IS NULL)
    OR ("outcome" = 'FAILURE' AND "error_code" IS NOT NULL AND "old_values" IS NULL AND "new_values" IS NULL)
);

CREATE FUNCTION "audit_logs_reject_change"() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only: % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "audit_logs_append_only"
    BEFORE UPDATE OR DELETE ON "audit_logs"
    FOR EACH ROW EXECUTE FUNCTION "audit_logs_reject_change"();
