import type { Request } from 'express';
import type { UserRole } from './user-role.js';

export interface AuthenticatedUser {
  id: number;
  uuid: string;
  username: string;
  role: UserRole;
  employee_id: number | null;
}

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };
