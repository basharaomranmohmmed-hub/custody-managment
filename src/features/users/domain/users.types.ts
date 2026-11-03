import type { UserRole } from '../../../shared/auth/user-role.js';

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export const ASSIGNABLE_USER_ROLES = [
  'WAREHOUSE_KEEPER',
  'AUDITOR',
  'EMPLOYEE',
] as const satisfies readonly UserRole[];

export type AssignableUserRole = (typeof ASSIGNABLE_USER_ROLES)[number];

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,48}[a-z0-9]$/;

export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_MAX_BYTES = 72;

export const PASSWORD_SALT_ROUNDS = 10;

export interface CreateUserData {
  username: string;
  password_hash: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  employee_id: number | null;
  created_by: number | null;
}

export interface UpdateUserData {
  username?: string;
  password_hash?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: UserRole;
  employee_id?: number | null;
  is_active?: boolean;
}

export interface EmployeeRef {
  id: number;
  uuid: string;
  employee_no: string;
  full_name: string;
}

export interface UserEntity {
  id: number;
  uuid: string;

  username: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  employee_id: number | null;
  employee: EmployeeRef | null;
  is_active: boolean;

  created_by: number | null;
  created_at: Date;
  updated_at: Date | null;

  deleted_at: Date | null;
  deleted_by: number | null;
}

export interface UserCredentials {
  id: number;
  uuid: string;
  password_hash: string;
  is_active: boolean;
}

export interface UserFilters {
  roles: readonly UserRole[];
  is_active?: boolean;
  search?: string;
}

export interface UsersRepository {
  create(data: CreateUserData): Promise<UserEntity>;

  findAll(
    filters: UserFilters,
    pagination: { skip: number; take: number },
  ): Promise<{ users: UserEntity[]; total: number }>;

  findByUuid(uuid: string): Promise<UserEntity | null>;

  findByUuidForUpdate(uuid: string): Promise<UserEntity | null>;

  findByUsername(username: string): Promise<UserEntity | null>;

  findByEmployeeId(employeeId: number): Promise<UserEntity | null>;

  findCredentialsByUsername(username: string): Promise<UserCredentials | null>;

  updateById(id: number, data: UpdateUserData): Promise<UserEntity>;
}
