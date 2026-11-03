import type { UserRole } from '../../../shared/auth/user-role.js';
import type { ItemEventType } from '../../item-events/domain/item-events.types.js';

export const DOCUMENTS_REPOSITORY = Symbol('DOCUMENTS_REPOSITORY');

export const DOCUMENT_TYPES = [
  'HANDOVER_RECEIPT',
  'RETURN_RECEIPT',
  'CLEARANCE',
  'OTHER',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_DOCUMENT_FILE_TYPES: Readonly<
  Record<string, readonly string[]>
> = {
  'application/pdf': ['pdf'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
};

export const DOCUMENTABLE_EVENT_TYPES: readonly ItemEventType[] = [
  'HANDOVER',
  'RETURN',
];

export const DOCUMENT_ISSUER_ROLES: readonly UserRole[] = [
  'ADMIN',
  'WAREHOUSE_KEEPER',
];

export interface CreateDocumentData {
  doc_no: string;
  doc_type: DocumentType;
  employee_id: number;
  issued_at: Date;
  issued_by: number | null;
  storage_key: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_by: number | null;
}

export interface UpdateDocumentData {
  doc_no?: string;
  doc_type?: DocumentType;
  issued_at?: Date;
  issued_by?: number;
}

export interface EmployeeRef {
  id: number;
  uuid: string;
  employee_no: string;
  full_name: string;
}

export interface ItemEventRef {
  id: number;
  uuid: string;
}

export interface UserRef {
  id: number;
  uuid: string;
  username: string;
}

export interface DocumentEntity {
  id: number;
  uuid: string;

  doc_no: string;
  doc_type: DocumentType;
  employee_id: number;
  employee: EmployeeRef;
  issued_at: Date;
  issued_by: number | null;
  issuer: UserRef | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  item_events: ItemEventRef[];

  created_by: number | null;
  creator: UserRef | null;
  created_at: Date;
  updated_at: Date | null;

  deleted_at: Date | null;
  deleted_by: number | null;
}

export interface DocumentFile {
  storage_key: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
}

export interface DocumentableItemEvent {
  id: number;
  uuid: string;
  event_type: ItemEventType;
  employee_id: number | null;
  document_id: number | null;
}

export interface DocumentFilters {
  employee_id?: number;
  item_id?: number;
  doc_type?: DocumentType;
  issued_by?: number;
  issued_from?: Date;
  issued_to?: Date;
  search?: string;
}

export interface DocumentsRepository {
  create(data: CreateDocumentData): Promise<DocumentEntity>;

  findAll(
    filters: DocumentFilters,
    pagination: { skip: number; take: number },
  ): Promise<{ documents: DocumentEntity[]; total: number }>;

  findByUuid(uuid: string): Promise<DocumentEntity | null>;

  findByUuidForUpdate(uuid: string): Promise<DocumentEntity | null>;

  findByUuidForEmployee(
    uuid: string,
    employeeId: number,
  ): Promise<DocumentEntity | null>;

  findByDocNo(docNo: string): Promise<{ id: number; doc_no: string } | null>;

  findFileById(id: number): Promise<DocumentFile | null>;

  existsByStorageKey(storageKey: string): Promise<boolean>;

  updateById(id: number, data: UpdateDocumentData): Promise<DocumentEntity>;

  softDeleteById(id: number, deletedBy: number | null): Promise<void>;

  findItemEventsByUuidsForUpdate(
    uuids: string[],
  ): Promise<DocumentableItemEvent[]>;

  setItemEventsDocument(
    itemEventIds: number[],
    documentId: number | null,
  ): Promise<void>;
}
