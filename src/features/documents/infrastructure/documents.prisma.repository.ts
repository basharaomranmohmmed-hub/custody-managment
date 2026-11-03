import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../core/database/prisma.service.js';
import { escapeLikePattern } from '../../../shared/database/escape-like-pattern.js';
import type {
  CreateDocumentData,
  DocumentableItemEvent,
  DocumentEntity,
  DocumentFile,
  DocumentFilters,
  DocumentsRepository,
  UpdateDocumentData,
} from '../domain/documents.types.js';

const documentSelect = {
  id: true,
  uuid: true,
  doc_no: true,
  doc_type: true,
  employee_id: true,
  employee: {
    select: { id: true, uuid: true, employee_no: true, full_name: true },
  },
  issued_at: true,
  issued_by: true,
  issuer: { select: { id: true, uuid: true, username: true } },
  file_name: true,
  mime_type: true,
  size_bytes: true,
  item_events: { select: { id: true, uuid: true }, orderBy: { id: 'asc' } },
  created_by: true,
  creator: { select: { id: true, uuid: true, username: true } },
  created_at: true,
  updated_at: true,
  deleted_at: true,
  deleted_by: true,
} satisfies Prisma.documentsSelect;

@Injectable()
export class PrismaDocumentsRepository implements DocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateDocumentData): Promise<DocumentEntity> {
    return this.prisma.db().documents.create({ data, select: documentSelect });
  }

  async findAll(
    filters: DocumentFilters,
    { skip, take }: { skip: number; take: number },
  ): Promise<{ documents: DocumentEntity[]; total: number }> {
    const pattern = filters.search && escapeLikePattern(filters.search);
    const where: Prisma.documentsWhereInput = {
      employee_id: filters.employee_id,
      doc_type: filters.doc_type,
      issued_by: filters.issued_by,
      item_events:
        filters.item_id === undefined
          ? undefined
          : { some: { item_id: filters.item_id } },
      issued_at:
        filters.issued_from || filters.issued_to
          ? { gte: filters.issued_from, lte: filters.issued_to }
          : undefined,
      OR: pattern
        ? [
            { doc_no: { contains: pattern, mode: 'insensitive' } },
            { file_name: { contains: pattern, mode: 'insensitive' } },
          ]
        : undefined,
      deleted_at: null,
    };

    const [documents, total] = await this.prisma.$transaction([
      this.prisma.documents.findMany({
        where,
        select: documentSelect,
        orderBy: [{ issued_at: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.documents.count({ where }),
    ]);

    return { documents, total };
  }

  findByUuid(uuid: string): Promise<DocumentEntity | null> {
    return this.prisma.db().documents.findFirst({
      where: { uuid, deleted_at: null },
      select: documentSelect,
    });
  }

  findByUuidForEmployee(
    uuid: string,
    employeeId: number,
  ): Promise<DocumentEntity | null> {
    return this.prisma.db().documents.findFirst({
      where: { uuid, employee_id: employeeId, deleted_at: null },
      select: documentSelect,
    });
  }

  async findByUuidForUpdate(uuid: string): Promise<DocumentEntity | null> {
    const locked = await this.prisma.db().$queryRaw<{ id: number }[]>`
      SELECT id FROM documents
      WHERE uuid = ${uuid}::uuid AND deleted_at IS NULL
      FOR UPDATE`;
    return locked.length > 0 ? this.findByUuid(uuid) : null;
  }

  async findByDocNo(
    docNo: string,
  ): Promise<{ id: number; doc_no: string } | null> {
    const [match] = await this.prisma.db().$queryRaw<
      { id: number; doc_no: string }[]
    >`
      SELECT id, doc_no FROM documents
      WHERE lower(doc_no) = lower(${docNo})
      LIMIT 1`;
    return match ?? null;
  }

  findFileById(id: number): Promise<DocumentFile | null> {
    return this.prisma.db().documents.findFirst({
      where: { id, deleted_at: null },
      select: {
        storage_key: true,
        file_name: true,
        mime_type: true,
        size_bytes: true,
      },
    });
  }

  async existsByStorageKey(storageKey: string): Promise<boolean> {
    const count = await this.prisma.db().documents.count({
      where: { storage_key: storageKey },
    });
    return count > 0;
  }

  updateById(id: number, data: UpdateDocumentData): Promise<DocumentEntity> {
    return this.prisma.db().documents.update({
      where: { id },
      data,
      select: documentSelect,
    });
  }

  async softDeleteById(id: number, deletedBy: number | null): Promise<void> {
    await this.prisma.db().documents.update({
      where: { id },
      data: { deleted_at: new Date(), deleted_by: deletedBy },
    });
  }

  async findItemEventsByUuidsForUpdate(
    uuids: string[],
  ): Promise<DocumentableItemEvent[]> {
    if (uuids.length === 0) return [];
    const locked = await this.prisma.db().$queryRaw<{ id: number }[]>`
      SELECT id FROM item_events
      WHERE uuid IN (${Prisma.join(uuids.map((uuid) => Prisma.sql`${uuid}::uuid`))})
      ORDER BY id
      FOR UPDATE`;
    if (locked.length === 0) return [];

    const records = await this.prisma.db().item_events.findMany({
      where: { id: { in: locked.map(({ id }) => id) } },
      select: {
        id: true,
        uuid: true,
        event_type: true,
        document_id: true,
        started_possession: { select: { employee_id: true } },
        ended_possession: { select: { employee_id: true } },
      },
      orderBy: { id: 'asc' },
    });
    return records.map(
      ({ started_possession, ended_possession, ...event }) => ({
        ...event,
        employee_id:
          started_possession?.employee_id ??
          ended_possession?.employee_id ??
          null,
      }),
    );
  }

  async setItemEventsDocument(
    itemEventIds: number[],
    documentId: number | null,
  ): Promise<void> {
    await this.prisma.db().item_events.updateMany({
      where: { id: { in: itemEventIds } },
      data: { document_id: documentId },
    });
  }
}
