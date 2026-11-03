-- CreateEnum
CREATE TYPE "item_op_status" AS ENUM ('IN_SERVICE', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED');

-- CreateEnum
CREATE TYPE "item_tech_condition" AS ENUM ('GOOD', 'NEEDS_REPAIR', 'DAMAGED');

-- CreateTable
CREATE TABLE "custody_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "custody_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" SERIAL NOT NULL,
    "serial_no" TEXT NOT NULL,
    "serial_generated" BOOLEAN NOT NULL DEFAULT false,
    "type_id" INTEGER NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "purchase_date" DATE,
    "op_status" "item_op_status" NOT NULL,
    "tech_condition" "item_tech_condition" NOT NULL,
    "opening_balance" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custody_types_name_key" ON "custody_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "items_serial_no_key" ON "items"("serial_no");

-- CreateIndex
CREATE INDEX "items_type_id_idx" ON "items"("type_id");

-- CreateIndex
CREATE INDEX "items_op_status_idx" ON "items"("op_status");

-- CreateIndex
CREATE INDEX "items_tech_condition_idx" ON "items"("tech_condition");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "custody_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
