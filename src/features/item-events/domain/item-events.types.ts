import type {
  ItemOpStatus,
  ItemTechCondition,
} from '../../items/domain/items.types.js';

export const ITEM_EVENTS_REPOSITORY = Symbol('ITEM_EVENTS_REPOSITORY');

export const ITEM_EVENT_TYPES = [
  'HANDOVER',
  'RETURN',
  'STATUS_CHANGE',
] as const;

export type ItemEventType = (typeof ITEM_EVENT_TYPES)[number];

export interface RecordItemEventData {
  item_id: number;
  event_type: ItemEventType;
  op_status_before: ItemOpStatus;
  op_status_after: ItemOpStatus;
  condition_before: ItemTechCondition;
  condition_after: ItemTechCondition;
  reason?: string | null;
  occurred_at: Date;
  report_id?: number | null;
}

export interface CreateItemEventData extends RecordItemEventData {
  reason: string | null;
  performed_by: number | null;
}

export interface ItemRef {
  id: number;
  uuid: string;
  serial_no: string;
}

export interface PossessionRef {
  id: number;
  uuid: string;
}

export interface ReportRef {
  id: number;
  uuid: string;
}

export interface UserRef {
  id: number;
  uuid: string;
  username: string;
}

export interface ItemEventEntity {
  id: number;
  uuid: string;

  item_id: number;
  item: ItemRef;
  event_type: ItemEventType;
  op_status_before: ItemOpStatus;
  op_status_after: ItemOpStatus;
  condition_before: ItemTechCondition;
  condition_after: ItemTechCondition;
  reason: string | null;
  occurred_at: Date;
  recorded_at: Date;
  document_id: number | null;
  possession: PossessionRef | null;
  report: ReportRef | null;
  performed_by: number | null;
  performer: UserRef | null;
}

export interface ItemEventFilters {
  item_uuid?: string;
  event_type?: ItemEventType;
  occurred_from?: Date;
  occurred_to?: Date;
}

export interface ItemEventsRepository {
  create(data: CreateItemEventData): Promise<ItemEventEntity>;

  findAll(
    filters: ItemEventFilters,
    pagination: { skip: number; take: number },
  ): Promise<{ item_events: ItemEventEntity[]; total: number }>;

  findByUuid(uuid: string): Promise<ItemEventEntity | null>;

  findLatestOccurredAt(itemId: number): Promise<Date | null>;
}
