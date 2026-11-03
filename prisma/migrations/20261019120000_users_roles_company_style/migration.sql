-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('SUPER_ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR', 'EMPLOYEE');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN "uuid" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "employees" ALTER COLUMN "uuid" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN "role" "user_role" NOT NULL DEFAULT 'EMPLOYEE',
ADD COLUMN "created_by" INTEGER,
ADD COLUMN "updated_at" TIMESTAMP(3),
ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "deleted_by" INTEGER;
ALTER TABLE "users" ALTER COLUMN "uuid" DROP DEFAULT;

UPDATE "users" SET "role" = 'SUPER_ADMIN' WHERE "is_super_admin";

ALTER TABLE "users" DROP COLUMN "is_super_admin";

-- DropForeignKey
ALTER TABLE "user_permissions" DROP CONSTRAINT "user_permissions_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "user_permissions" DROP CONSTRAINT "user_permissions_user_id_fkey";

-- DropTable
DROP TABLE "user_permissions";

-- DropTable
DROP TABLE "permissions";

-- CreateIndex
CREATE UNIQUE INDEX "employees_uuid_key" ON "employees"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "users_uuid_key" ON "users"("uuid");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");
