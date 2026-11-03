export const AUDIT_LOGS_REPOSITORY = Symbol('AUDIT_LOGS_REPOSITORY');

export const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'STATUS_CHANGE',
  'HANDOVER',
  'RETURN',
  'RESOLVE',
  'DELETE',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITY_TYPES = [
  'DEPARTMENT',
  'EMPLOYEE',
  'CUSTODY_TYPE',
  'ITEM',
  'POSSESSION',
  'INCIDENT_REPORT',
  'DOCUMENT',
  'USER',
  'ROLE',
  'PERMISSION',
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export const AUDIT_OUTCOMES = ['SUCCESS', 'FAILURE'] as const;

export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

export type AuditValues = Record<string, string | number | boolean | null>;

export interface CreateAuditLogData {
  user_id: number | null;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: number | null;
  old_values: AuditValues | null;
  new_values: AuditValues | null;
  outcome: AuditOutcome;
  error_code: string | null;
  ip_address: string | null;
}

export interface UserRef {
  id: number;
  uuid: string;
  username: string;
}

export interface AuditedEntityRef {
  id: number;
  uuid: string;
}

export interface AuditLogEntity {
  id: number;
  uuid: string;

  user_id: number | null;
  user: UserRef | null;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: number | null;
  entity: AuditedEntityRef | null;
  old_values: AuditValues | null;
  new_values: AuditValues | null;
  outcome: AuditOutcome;
  error_code: string | null;
  ip_address: string | null;

  created_at: Date;
}

export interface AuditLogFilters {
  user_id?: number;
  action?: AuditAction;
  entity_type?: AuditEntityType;
  entity_id?: number;
  outcome?: AuditOutcome;
  error_code?: string;
  created_from?: Date;
  created_to?: Date;
}

export interface AuditLogsRepository {
  create(data: CreateAuditLogData): Promise<void>;

  findAll(
    filters: AuditLogFilters,
    pagination: { skip: number; take: number },
  ): Promise<{ audit_logs: AuditLogEntity[]; total: number }>;

  findByUuid(uuid: string): Promise<AuditLogEntity | null>;

  findEntityId(
    entityType: AuditEntityType,
    uuid: string,
  ): Promise<number | null>;
}
