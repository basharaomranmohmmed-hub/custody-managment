import type { IsoDate } from '../../../shared/date/date-only.js';

export const ITEMS_REPOSITORY = Symbol('ITEMS_REPOSITORY');

export const ITEM_OP_STATUSES = [
  'IN_SERVICE',
  'UNDER_MAINTENANCE',
  'OUT_OF_SERVICE',
  'RETIRED',
] as const;

export type ItemOpStatus = (typeof ITEM_OP_STATUSES)[number];

export const ITEM_TECH_CONDITIONS = [
  'GOOD',
  'NEEDS_REPAIR',
  'DAMAGED',
] as const;

export type ItemTechCondition = (typeof ITEM_TECH_CONDITIONS)[number];

export interface CreateItemData {
  serial_no: string;
  custody_type_id: number;
  brand: string | null;
  model: string | null;
  purchase_date: IsoDate | null;
  op_status: ItemOpStatus;
  tech_condition: ItemTechCondition;
  opening_balance: boolean;
  notes: string | null;
  created_by: number | null;
}

export interface UpdateItemData {
  serial_no?: string;
  custody_type_id?: number;
  brand?: string | null;
  model?: string | null;
  purchase_date?: IsoDate | null;
  op_status?: ItemOpStatus;
  tech_condition?: ItemTechCondition;
  notes?: string | null;
}

export interface CustodyTypeRef {
  id: number;
  uuid: string;
  name: string;
}

export interface ItemEntity {
  id: number;
  uuid: string;

  serial_no: string;
  serial_generated: boolean;
  custody_type_id: number;
  custody_type: CustodyTypeRef;
  brand: string | null;
  model: string | null;
  purchase_date: IsoDate | null;
  op_status: ItemOpStatus;
  tech_condition: ItemTechCondition;
  opening_balance: boolean;
  notes: string | null;

  created_by: number | null;
  created_at: Date;
  updated_at: Date | null;

  deleted_at: Date | null;
  deleted_by: number | null;
}

export interface ItemFilters {
  custody_type_id?: number;
  op_status?: ItemOpStatus;
  tech_condition?: ItemTechCondition;
  brand?: string;
  model?: string;
  search?: string;
}

export interface ItemsRepository {
  create(data: CreateItemData): Promise<ItemEntity>;

  findAll(
    filters: ItemFilters,
    pagination: { skip: number; take: number },
  ): Promise<{ items: ItemEntity[]; total: number }>;

  findById(id: number): Promise<ItemEntity | null>;

  findByIdForUpdate(id: number): Promise<ItemEntity | null>;

  findByUuid(uuid: string): Promise<ItemEntity | null>;

  findByUuidForUpdate(uuid: string): Promise<ItemEntity | null>;

  findBySerialNo(serialNo: string): Promise<ItemEntity | null>;

  updateById(id: number, data: UpdateItemData): Promise<ItemEntity>;

  countOpenPossessions(itemId: number): Promise<number>;
}
