import type { IsoDate } from '../../../shared/date/date-only.js';
import type { ItemEventType } from '../../item-events/domain/item-events.types.js';
import type {
  ItemOpStatus,
  ItemTechCondition,
} from '../../items/domain/items.types.js';

export const POSSESSIONS_REPOSITORY = Symbol('POSSESSIONS_REPOSITORY');

export const POSSESSION_STATUSES = ['OPEN', 'CLOSED'] as const;

export type PossessionStatus = (typeof POSSESSION_STATUSES)[number];

export interface CreatePossessionData {
  item_id: number;
  employee_id: number;
  department_id: number;
  start_event_id: number;
  started_at: Date;
  due_date: IsoDate | null;
  accessories: string | null;
  condition_at_start: ItemTechCondition;
  notes: string | null;
  created_by: number | null;
}

export interface ClosePossessionData {
  end_event_id: number;
  ended_at: Date;
  end_reason: string | null;
  condition_at_end: ItemTechCondition;
}

export interface ItemRef {
  id: number;
  uuid: string;
  serial_no: string;
  custody_type: { id: number; uuid: string; name: string };
}

export interface EmployeeRef {
  id: number;
  uuid: string;
  employee_no: string;
  full_name: string;
}

export interface DepartmentRef {
  id: number;
  uuid: string;
  name: string;
}

export interface UserRef {
  id: number;
  uuid: string;
  username: string;
}

export interface PossessionEventEntity {
  id: number;
  event_type: ItemEventType;
  op_status_before: ItemOpStatus;
  op_status_after: ItemOpStatus;
  condition_before: ItemTechCondition;
  condition_after: ItemTechCondition;
  reason: string | null;
  occurred_at: Date;
  recorded_at: Date;
  document_id: number | null;
  performed_by: number | null;
  performer: UserRef | null;
}

export interface PossessionEntity {
  id: number;
  uuid: string;

  item_id: number;
  item: ItemRef;
  employee_id: number;
  employee: EmployeeRef;
  department_id: number;
  department: DepartmentRef;
  start_event_id: number;
  end_event_id: number | null;
  started_at: Date;
  ended_at: Date | null;
  end_reason: string | null;
  due_date: IsoDate | null;
  accessories: string | null;
  condition_at_start: ItemTechCondition;
  condition_at_end: ItemTechCondition | null;
  notes: string | null;

  created_by: number | null;
  created_at: Date;
  updated_at: Date | null;
}

export interface PossessionDetailsEntity extends PossessionEntity {
  start_event: PossessionEventEntity;
  end_event: PossessionEventEntity | null;
}

export interface PossessionFilters {
  item_id?: number;
  employee_id?: number;
  department_id?: number;
  status?: PossessionStatus;
  started_from?: Date;
  started_to?: Date;
}

export interface PossessionsRepository {
  create(data: CreatePossessionData): Promise<PossessionEntity>;

  findAll(
    filters: PossessionFilters,
    pagination: { skip: number; take: number },
  ): Promise<{ possessions: PossessionEntity[]; total: number }>;

  findById(id: number): Promise<PossessionEntity | null>;

  findByUuid(uuid: string): Promise<PossessionEntity | null>;

  findDetailsByUuid(uuid: string): Promise<PossessionDetailsEntity | null>;

  findOpenByItemId(itemId: number): Promise<PossessionEntity | null>;

  closeById(id: number, data: ClosePossessionData): Promise<PossessionEntity>;
}
