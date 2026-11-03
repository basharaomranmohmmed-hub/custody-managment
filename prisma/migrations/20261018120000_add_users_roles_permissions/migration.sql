-- CreateEnum
CREATE TYPE "role_code" AS ENUM ('SUPER_ADMIN', 'WAREHOUSE_OFFICER', 'EMPLOYEE', 'AUDITOR');

-- CreateEnum
CREATE TYPE "permission_code" AS ENUM ('DEPARTMENTS_READ', 'DEPARTMENTS_MANAGE', 'EMPLOYEES_READ', 'EMPLOYEES_MANAGE', 'CUSTODY_TYPES_READ', 'CUSTODY_TYPES_MANAGE', 'ITEMS_READ', 'ITEMS_MANAGE', 'ITEM_EVENTS_READ', 'POSSESSIONS_READ', 'POSSESSIONS_MANAGE', 'INCIDENT_REPORTS_READ', 'INCIDENT_REPORTS_MANAGE', 'INCIDENT_REPORTS_RESOLVE', 'DOCUMENTS_READ', 'DOCUMENTS_MANAGE', 'AUDIT_LOGS_READ', 'USERS_READ', 'USERS_MANAGE', 'PERMISSIONS_READ', 'PERMISSIONS_MANAGE');

-- AlterEnum
ALTER TYPE "audit_entity_type" ADD VALUE 'USER';
ALTER TYPE "audit_entity_type" ADD VALUE 'ROLE';

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "user_id" INTEGER;

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "code" "role_code" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission" "permission_code" NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role_id" INTEGER NOT NULL,
    "employee_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "users" ADD CONSTRAINT "users_username_lowercase_check" CHECK ("username" = lower("username"));

INSERT INTO "roles" ("code", "name") VALUES
    ('SUPER_ADMIN', 'Super Administrator'),
    ('WAREHOUSE_OFFICER', 'Warehouse Officer'),
    ('EMPLOYEE', 'Employee'),
    ('AUDITOR', 'Auditor')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission")
SELECT r."id", d."permission"::"permission_code"
FROM (VALUES
    ('WAREHOUSE_OFFICER', 'DEPARTMENTS_READ'),
    ('WAREHOUSE_OFFICER', 'EMPLOYEES_READ'),
    ('WAREHOUSE_OFFICER', 'CUSTODY_TYPES_READ'),
    ('WAREHOUSE_OFFICER', 'CUSTODY_TYPES_MANAGE'),
    ('WAREHOUSE_OFFICER', 'ITEMS_READ'),
    ('WAREHOUSE_OFFICER', 'ITEMS_MANAGE'),
    ('WAREHOUSE_OFFICER', 'ITEM_EVENTS_READ'),
    ('WAREHOUSE_OFFICER', 'POSSESSIONS_READ'),
    ('WAREHOUSE_OFFICER', 'POSSESSIONS_MANAGE'),
    ('WAREHOUSE_OFFICER', 'INCIDENT_REPORTS_READ'),
    ('WAREHOUSE_OFFICER', 'INCIDENT_REPORTS_MANAGE'),
    ('WAREHOUSE_OFFICER', 'INCIDENT_REPORTS_RESOLVE'),
    ('WAREHOUSE_OFFICER', 'DOCUMENTS_READ'),
    ('WAREHOUSE_OFFICER', 'DOCUMENTS_MANAGE'),
    ('AUDITOR', 'DEPARTMENTS_READ'),
    ('AUDITOR', 'EMPLOYEES_READ'),
    ('AUDITOR', 'CUSTODY_TYPES_READ'),
    ('AUDITOR', 'ITEMS_READ'),
    ('AUDITOR', 'ITEM_EVENTS_READ'),
    ('AUDITOR', 'POSSESSIONS_READ'),
    ('AUDITOR', 'INCIDENT_REPORTS_READ'),
    ('AUDITOR', 'DOCUMENTS_READ'),
    ('AUDITOR', 'AUDIT_LOGS_READ'),
    ('AUDITOR', 'USERS_READ'),
    ('AUDITOR', 'PERMISSIONS_READ')
) AS d("role_code", "permission")
JOIN "roles" r ON r."code" = d."role_code"::"role_code"
ON CONFLICT ("role_id", "permission") DO NOTHING;