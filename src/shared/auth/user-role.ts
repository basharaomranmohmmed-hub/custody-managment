export const USER_ROLES = [
  'ADMIN',
  'WAREHOUSE_KEEPER',
  'AUDITOR',
  'EMPLOYEE',
] as const;

export type UserRole = (typeof USER_ROLES)[number];
