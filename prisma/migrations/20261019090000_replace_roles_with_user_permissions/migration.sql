-- AlterEnum
ALTER TYPE "audit_entity_type" ADD VALUE 'PERMISSION';

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "user_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("user_id","permission_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "user_permissions_permission_id_idx" ON "user_permissions"("permission_id");

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "permissions" ADD CONSTRAINT "permissions_code_format_check" CHECK ("code" ~ '^[A-Z][A-Z0-9_]{2,63}$');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_super_admin" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "permissions" ("code", "description") VALUES
    ('DEPARTMENTS_READ', 'View departments'),
    ('DEPARTMENTS_MANAGE', 'Create, rename, activate and deactivate departments'),
    ('EMPLOYEES_READ', 'View employees'),
    ('EMPLOYEES_MANAGE', 'Create and update employees and change their status'),
    ('CUSTODY_TYPES_READ', 'View custody types'),
    ('CUSTODY_TYPES_MANAGE', 'Create, update, activate and deactivate custody types'),
    ('ITEMS_READ', 'View items'),
    ('ITEMS_MANAGE', 'Register and update items and change their status'),
    ('ITEM_EVENTS_READ', 'View the item event history'),
    ('POSSESSIONS_READ', 'View possessions'),
    ('POSSESSIONS_MANAGE', 'Hand items over to employees and record their return'),
    ('INCIDENT_REPORTS_READ', 'View incident reports'),
    ('INCIDENT_REPORTS_MANAGE', 'Open and update incident reports'),
    ('INCIDENT_REPORTS_RESOLVE', 'Resolve incident reports'),
    ('DOCUMENTS_READ', 'View documents and download their files'),
    ('DOCUMENTS_MANAGE', 'Upload, update and delete documents and link them to item events'),
    ('AUDIT_LOGS_READ', 'View the audit log')
ON CONFLICT ("code") DO NOTHING;

UPDATE "users" u
SET "is_super_admin" = true
FROM "roles" r
WHERE r."id" = u."role_id" AND r."code" = 'SUPER_ADMIN';

INSERT INTO "user_permissions" ("user_id", "permission_id")
SELECT u."id", p."id"
FROM "users" u
JOIN "role_permissions" rp ON rp."role_id" = u."role_id"
JOIN "permissions" p ON p."code" = rp."permission"::text
WHERE NOT u."is_super_admin"
ON CONFLICT DO NOTHING;

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_role_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_role_id_fkey";

-- DropIndex
DROP INDEX "users_role_id_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role_id";

-- DropTable
DROP TABLE "role_permissions";

-- DropTable
DROP TABLE "roles";

-- DropEnum
DROP TYPE "permission_code";

-- DropEnum
DROP TYPE "role_code";
