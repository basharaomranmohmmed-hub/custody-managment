-- CreateEnum
CREATE TYPE "employee_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" SERIAL NOT NULL,
    "employee_no" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "department_id" INTEGER NOT NULL,
    "job_title" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" "employee_status" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" DATE,
    "terminated_at" DATE,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employee_no_key" ON "employees"("employee_no");

-- CreateIndex
CREATE INDEX "employees_department_id_idx" ON "employees"("department_id");

-- CreateIndex
CREATE INDEX "employees_status_idx" ON "employees"("status");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
