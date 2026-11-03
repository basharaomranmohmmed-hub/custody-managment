-- CreateEnum
CREATE TYPE "item_event_type" AS ENUM ('HANDOVER', 'RETURN', 'STATUS_CHANGE');

-- CreateTable
CREATE TABLE "item_events" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "event_type" "item_event_type" NOT NULL,
    "op_status_before" "item_op_status" NOT NULL,
    "op_status_after" "item_op_status" NOT NULL,
    "condition_before" "item_tech_condition" NOT NULL,
    "condition_after" "item_tech_condition" NOT NULL,
    "reason" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "possessions" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "department_id" INTEGER NOT NULL,
    "start_event_id" INTEGER NOT NULL,
    "end_event_id" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "end_reason" TEXT,
    "due_date" DATE,
    "accessories" TEXT,
    "condition_at_start" "item_tech_condition" NOT NULL,
    "condition_at_end" "item_tech_condition",
    "notes" TEXT,

    CONSTRAINT "possessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_events_item_id_occurred_at_idx" ON "item_events"("item_id", "occurred_at");

-- CreateIndex
CREATE INDEX "item_events_event_type_idx" ON "item_events"("event_type");

-- CreateIndex
CREATE INDEX "item_events_occurred_at_idx" ON "item_events"("occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "possessions_start_event_id_key" ON "possessions"("start_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "possessions_end_event_id_key" ON "possessions"("end_event_id");

-- CreateIndex
CREATE INDEX "possessions_item_id_idx" ON "possessions"("item_id");

-- CreateIndex
CREATE INDEX "possessions_employee_id_idx" ON "possessions"("employee_id");

-- CreateIndex
CREATE INDEX "possessions_department_id_idx" ON "possessions"("department_id");

-- CreateIndex
CREATE INDEX "possessions_started_at_idx" ON "possessions"("started_at");

-- CreateIndex
CREATE UNIQUE INDEX "possessions_one_open_per_item_key" ON "possessions"("item_id") WHERE ("ended_at" IS NULL);

-- AddForeignKey
ALTER TABLE "item_events" ADD CONSTRAINT "item_events_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "possessions" ADD CONSTRAINT "possessions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "possessions" ADD CONSTRAINT "possessions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "possessions" ADD CONSTRAINT "possessions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "possessions" ADD CONSTRAINT "possessions_start_event_id_fkey" FOREIGN KEY ("start_event_id") REFERENCES "item_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "possessions" ADD CONSTRAINT "possessions_end_event_id_fkey" FOREIGN KEY ("end_event_id") REFERENCES "item_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "possessions" ADD CONSTRAINT "possessions_end_fields_consistent_check" CHECK (
    ("ended_at" IS NULL AND "end_event_id" IS NULL AND "condition_at_end" IS NULL)
    OR ("ended_at" IS NOT NULL AND "end_event_id" IS NOT NULL AND "condition_at_end" IS NOT NULL)
);

ALTER TABLE "possessions" ADD CONSTRAINT "possessions_ended_after_started_check" CHECK (
    "ended_at" IS NULL OR "ended_at" >= "started_at"
);
