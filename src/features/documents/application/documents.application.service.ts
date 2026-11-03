import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import type { Readable } from 'node:stream';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.js';
import { resolvePastInstant } from '../../../shared/date/instant.js';
import { AppException } from '../../../shared/exceptions/app.exception.js';
import { resolvePagination } from '../../../shared/http/pagination.js';
import { successResponse } from '../../../shared/http/success-response.js';
import { AuditTrail } from '../../audit-logs/application/audit-trail.js';
import {
  type EmployeeEntity,
  EMPLOYEES_REPOSITORY,
  type EmployeesRepository,
} from '../../employees/domain/employees.types.js';
import {
  ITEMS_REPOSITORY,
  type ItemsRepository,
} from '../../items/domain/items.types.js';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../../users/domain/users.types.js';
import {
  DOCUMENT_STORAGE,
  type DocumentStorage,
} from '../domain/document-storage.js';
import {
  DOCUMENT_ISSUER_ROLES,
  DOCUMENTABLE_EVENT_TYPES,
  type DocumentableItemEvent,
  type DocumentEntity,
  type DocumentFilters,
  DOCUMENTS_REPOSITORY,
  type DocumentsRepository,
  type UpdateDocumentData,
} from '../domain/documents.types.js';
import type { CreateDocumentDto } from '../presentation/http/dto/create-document.dto.js';
import type { FilterDocumentDto } from '../presentation/http/dto/filter-document.dto.js';
import type { LinkItemEventsDto } from '../presentation/http/dto/link-item-events.dto.js';
import type { UpdateDocumentDto } from '../presentation/http/dto/update-document.dto.js';
import {
  type DocumentUpload,
  inspectDocumentFile,
} from './document-file-inspector.js';

export interface DocumentDownload {
  stream: Readable;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

const toInstant = (value?: string) => (value ? new Date(value) : undefined);

@Injectable()
export class DocumentsApplicationService {
  private readonly logger = new Logger(DocumentsApplicationService.name);

  constructor(
    @Inject(DOCUMENTS_REPOSITORY)
    private readonly documentsRepository: DocumentsRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employeesRepository: EmployeesRepository,
    @Inject(ITEMS_REPOSITORY)
    private readonly itemsRepository: ItemsRepository,
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    @Inject(DOCUMENT_STORAGE)
    private readonly storage: DocumentStorage,
    private readonly auditTrail: AuditTrail,
  ) {}

  async create(
    dto: CreateDocumentDto,
    upload: DocumentUpload | undefined,
    user: AuthenticatedUser,
  ) {
    const pending: { storageKey?: string } = {};
    try {
      return await this.auditTrail.run(
        { action: 'CREATE', entityType: 'DOCUMENT' },
        async () => {
          if (!upload) {
            throw new AppException({
              message: 'أرفق الوثيقة في الحقل file',
              errorCode: 'DOCUMENT_FILE_REQUIRED',
              statusCode: HttpStatus.BAD_REQUEST,
            });
          }
          const issuedAt = this.resolveIssuedAt(toInstant(dto.issued_at));
          const file = await inspectDocumentFile(upload);
          const employee = await this.findEmployeeOrFail(dto.employee_uuid);
          const issuedBy = dto.issued_by_uuid
            ? await this.resolveIssuerId(dto.issued_by_uuid)
            : user.id;
          await this.assertDocNoAvailable(dto.doc_no);

          pending.storageKey = await this.storage.save(upload.content);
          const created = await this.documentsRepository.create({
            doc_no: dto.doc_no,
            doc_type: dto.doc_type,
            employee_id: employee.id,
            issued_at: issuedAt,
            issued_by: issuedBy,
            storage_key: pending.storageKey,
            file_name: file.fileName,
            mime_type: file.mimeType,
            size_bytes: file.sizeBytes,
            created_by: user.id,
          });

          return {
            result: successResponse({ response: created }),
            change: { entityId: created.id, after: created },
          };
        },
      );
    } catch (error) {
      if (pending.storageKey) {
        await this.discardUnreferencedFile(pending.storageKey);
      }
      throw error;
    }
  }

  async findAll(filter: FilterDocumentDto) {
    const issuedFrom = toInstant(filter.issued_from);
    const issuedTo = toInstant(filter.issued_to);
    if (issuedFrom && issuedTo && issuedFrom > issuedTo) {
      throw new AppException({
        message: 'تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية',
        errorCode: 'INVALID_DATE_RANGE',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const filters: DocumentFilters = {
      doc_type: filter.doc_type,
      issued_from: issuedFrom,
      issued_to: issuedTo,
      search: filter.search,
    };
    if (filter.employee_uuid !== undefined) {
      const employee = await this.employeesRepository.findByUuid(
        filter.employee_uuid,
      );
      if (!employee) return this.emptyPage();
      filters.employee_id = employee.id;
    }
    if (filter.item_uuid !== undefined) {
      const item = await this.itemsRepository.findByUuid(filter.item_uuid);
      if (!item) return this.emptyPage();
      filters.item_id = item.id;
    }
    if (filter.issued_by_uuid !== undefined) {
      const issuer = await this.usersRepository.findByUuid(
        filter.issued_by_uuid,
      );
      if (!issuer) return this.emptyPage();
      filters.issued_by = issuer.id;
    }

    const { documents, total } = await this.documentsRepository.findAll(
      filters,
      resolvePagination(filter),
    );

    return successResponse({ response: { data: documents, total } });
  }

  async findOne(uuid: string) {
    const response = await this.findDocumentOrFail(uuid);
    return successResponse({ response });
  }

  async download(uuid: string): Promise<DocumentDownload> {
    const document = await this.findDocumentOrFail(uuid);
    return this.openFile(document);
  }

  async findMine(uuid: string, user: AuthenticatedUser) {
    const response = await this.findOwnDocumentOrFail(uuid, user);
    return successResponse({ response });
  }

  async downloadMine(
    uuid: string,
    user: AuthenticatedUser,
  ): Promise<DocumentDownload> {
    const document = await this.findOwnDocumentOrFail(uuid, user);
    return this.openFile(document);
  }

  update(uuid: string, dto: UpdateDocumentDto) {
    return this.auditTrail.run(
      { action: 'UPDATE', entityType: 'DOCUMENT' },
      async (target) => {
        const document = await this.findDocumentOrFail(uuid, {
          forUpdate: true,
        });
        target.entityId = document.id;

        const issuedAt =
          dto.issued_at !== undefined
            ? this.resolveIssuedAt(toInstant(dto.issued_at))
            : undefined;

        const issuedBy = dto.issued_by_uuid
          ? await this.resolveIssuerId(dto.issued_by_uuid)
          : undefined;

        const updateData: UpdateDocumentData = {};
        if (dto.doc_no !== undefined && dto.doc_no !== document.doc_no) {
          await this.assertDocNoAvailable(dto.doc_no, document.id);
          updateData.doc_no = dto.doc_no;
        }
        if (dto.doc_type !== undefined && dto.doc_type !== document.doc_type) {
          updateData.doc_type = dto.doc_type;
        }
        if (
          issuedAt !== undefined &&
          issuedAt.getTime() !== document.issued_at.getTime()
        ) {
          updateData.issued_at = issuedAt;
        }
        if (issuedBy !== undefined && issuedBy !== document.issued_by) {
          updateData.issued_by = issuedBy;
        }

        if (Object.keys(updateData).length === 0) {
          return {
            result: successResponse({ response: document }),
            change: null,
          };
        }

        const updated = await this.documentsRepository.updateById(
          document.id,
          updateData,
        );

        return {
          result: successResponse({ response: updated }),
          change: { entityId: document.id, before: document, after: updated },
        };
      },
    );
  }

  remove(uuid: string, user: AuthenticatedUser) {
    return this.auditTrail.run(
      { action: 'DELETE', entityType: 'DOCUMENT' },
      async (target) => {
        const document = await this.findDocumentOrFail(uuid, {
          forUpdate: true,
        });
        target.entityId = document.id;

        if (document.item_events.length > 0) {
          throw new AppException({
            message: `لا يمكن حذف الوثيقة "${document.doc_no}" لأنها مرتبطة بحركات عهدة، افصلها أولاً`,
            errorCode: 'DOCUMENT_IN_USE',
            statusCode: HttpStatus.CONFLICT,
          });
        }

        await this.documentsRepository.softDeleteById(document.id, user.id);

        return {
          result: successResponse({
            response: { message: 'تم حذف الوثيقة بنجاح' },
          }),
          change: { entityId: document.id, before: document, after: {} },
        };
      },
    );
  }

  linkItemEvents(uuid: string, dto: LinkItemEventsDto) {
    return this.auditTrail.run(
      { action: 'UPDATE', entityType: 'DOCUMENT' },
      async (target) => {
        const document = await this.findDocumentOrFail(uuid, {
          forUpdate: true,
        });
        target.entityId = document.id;

        const events =
          await this.documentsRepository.findItemEventsByUuidsForUpdate(
            dto.item_event_uuids,
          );
        const eventsByUuid = new Map(
          events.map((event) => [event.uuid, event]),
        );
        for (const eventUuid of dto.item_event_uuids) {
          this.assertLinkable(document, eventsByUuid.get(eventUuid));
        }

        const unlinked = events
          .filter((event) => event.document_id === null)
          .map((event) => event.id);
        if (unlinked.length > 0) {
          await this.documentsRepository.setItemEventsDocument(
            unlinked,
            document.id,
          );
        }

        const updated = await this.findDocumentOrFail(uuid);
        return {
          result: successResponse({ response: updated }),
          change: linkChange(document, updated),
        };
      },
    );
  }

  unlinkItemEvent(uuid: string, itemEventUuid: string) {
    return this.auditTrail.run(
      { action: 'UPDATE', entityType: 'DOCUMENT' },
      async (target) => {
        const document = await this.findDocumentOrFail(uuid, {
          forUpdate: true,
        });
        target.entityId = document.id;

        const [event] =
          await this.documentsRepository.findItemEventsByUuidsForUpdate([
            itemEventUuid,
          ]);
        if (!event || event.document_id !== document.id) {
          throw new AppException({
            message: 'حركة العهدة غير مرتبطة بهذه الوثيقة',
            errorCode: 'ITEM_EVENT_NOT_LINKED',
            statusCode: HttpStatus.NOT_FOUND,
          });
        }

        await this.documentsRepository.setItemEventsDocument([event.id], null);

        const updated = await this.findDocumentOrFail(uuid);
        return {
          result: successResponse({ response: updated }),
          change: linkChange(document, updated),
        };
      },
    );
  }

  private emptyPage() {
    return successResponse({ response: { data: [], total: 0 } });
  }

  private assertLinkable(
    document: DocumentEntity,
    event: DocumentableItemEvent | undefined,
  ) {
    if (!event) {
      throw new AppException({
        message: 'حركة العهدة غير موجودة',
        errorCode: 'ITEM_EVENT_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    if (!DOCUMENTABLE_EVENT_TYPES.includes(event.event_type)) {
      throw new AppException({
        message: 'يمكن توثيق حركات التسليم والاستلام فقط',
        errorCode: 'ITEM_EVENT_NOT_DOCUMENTABLE',
        statusCode: HttpStatus.CONFLICT,
      });
    }
    if (event.employee_id !== document.employee_id) {
      throw new AppException({
        message: `حركة العهدة لا تخص عهدة الموظف "${document.employee.full_name}"`,
        errorCode: 'ITEM_EVENT_EMPLOYEE_MISMATCH',
        statusCode: HttpStatus.CONFLICT,
      });
    }
    if (event.document_id !== null && event.document_id !== document.id) {
      throw new AppException({
        message: 'حركة العهدة مرتبطة بوثيقة أخرى',
        errorCode: 'ITEM_EVENT_ALREADY_DOCUMENTED',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }

  private resolveIssuedAt(value: Date | undefined): Date {
    const issuedAt = resolvePastInstant(value);
    if (!issuedAt) {
      throw new AppException({
        message: 'تاريخ الإصدار لا يمكن أن يكون في المستقبل',
        errorCode: 'INVALID_ISSUE_DATE',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    return issuedAt;
  }

  private async discardUnreferencedFile(storageKey: string) {
    try {
      if (await this.documentsRepository.existsByStorageKey(storageKey)) return;
      await this.storage.remove(storageKey);
    } catch (error) {
      this.logger.error(
        `Could not discard the unreferenced uploaded file ${storageKey}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async assertDocNoAvailable(docNo: string, excludeId?: number) {
    const existing = await this.documentsRepository.findByDocNo(docNo);
    if (existing && existing.id !== excludeId) {
      throw new AppException({
        message: `رقم الوثيقة "${docNo}" مستخدم مسبقاً`,
        errorCode: 'DOCUMENT_NUMBER_TAKEN',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }

  private async findDocumentOrFail(
    uuid: string,
    { forUpdate = false }: { forUpdate?: boolean } = {},
  ): Promise<DocumentEntity> {
    const document = forUpdate
      ? await this.documentsRepository.findByUuidForUpdate(uuid)
      : await this.documentsRepository.findByUuid(uuid);
    if (!document) throw this.documentNotFound();
    return document;
  }

  private async openFile({
    id,
    uuid,
  }: DocumentEntity): Promise<DocumentDownload> {
    const file = await this.documentsRepository.findFileById(id);
    if (!file) throw this.documentNotFound();

    const stored = await this.storage.open(file.storage_key);
    if (!stored) {
      this.logger.error(`The stored file of document ${uuid} is missing`);
      throw new AppException({
        message: 'ملف الوثيقة غير متوفر',
        errorCode: 'DOCUMENT_FILE_MISSING',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    if (stored.sizeBytes !== file.size_bytes) {
      stored.stream.destroy();
      this.logger.error(
        `The stored file of document ${uuid} does not match its recorded size`,
      );
      throw new AppException({
        message: 'ملف الوثيقة تالف ولا يمكن عرضه',
        errorCode: 'DOCUMENT_FILE_CORRUPTED',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }

    return {
      stream: stored.stream,
      fileName: file.file_name,
      mimeType: file.mime_type,
      sizeBytes: file.size_bytes,
    };
  }

  private async findOwnDocumentOrFail(
    uuid: string,
    user: AuthenticatedUser,
  ): Promise<DocumentEntity> {
    if (user.employee_id === null) {
      throw new AppException({
        message: 'حسابك غير مرتبط بموظف',
        errorCode: 'EMPLOYEE_NOT_LINKED',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }
    const document = await this.documentsRepository.findByUuidForEmployee(
      uuid,
      user.employee_id,
    );
    if (!document) throw this.documentNotFound();
    return document;
  }

  private async resolveIssuerId(uuid: string): Promise<number> {
    const issuer = await this.usersRepository.findByUuid(uuid);
    if (!issuer) {
      throw new AppException({
        message: 'المستخدم غير موجود',
        errorCode: 'USER_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    if (!DOCUMENT_ISSUER_ROLES.includes(issuer.role)) {
      throw new AppException({
        message: 'مُصدر الوثيقة يجب أن يكون مدير النظام أو أمين المستودع',
        errorCode: 'DOCUMENT_ISSUER_NOT_ALLOWED',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    return issuer.id;
  }

  private documentNotFound() {
    return new AppException({
      message: 'الوثيقة غير موجودة',
      errorCode: 'DOCUMENT_NOT_FOUND',
      statusCode: HttpStatus.NOT_FOUND,
    });
  }

  private async findEmployeeOrFail(uuid: string): Promise<EmployeeEntity> {
    const employee = await this.employeesRepository.findByUuid(uuid);
    if (!employee) {
      throw new AppException({
        message: 'الموظف غير موجود',
        errorCode: 'EMPLOYEE_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return employee;
  }
}

function linkChange(before: DocumentEntity, after: DocumentEntity) {
  const uuids = (document: DocumentEntity) =>
    document.item_events.map(({ uuid }) => uuid).join(',');
  return {
    entityId: before.id,
    before: { item_event_uuids: uuids(before) },
    after: { item_event_uuids: uuids(after) },
  };
}
