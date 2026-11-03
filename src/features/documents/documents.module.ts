import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { ItemsModule } from '../items/items.module.js';
import { UsersModule } from '../users/users.module.js';
import { DocumentsApplicationService } from './application/documents.application.service.js';
import { DOCUMENT_STORAGE } from './domain/document-storage.js';
import { DOCUMENTS_REPOSITORY } from './domain/documents.types.js';
import { PrismaDocumentsRepository } from './infrastructure/documents.prisma.repository.js';
import {
  DEFAULT_DOCUMENTS_STORAGE_DIR,
  LocalDocumentStorage,
} from './infrastructure/local-document-storage.js';
import { DocumentsController } from './presentation/http/documents.controller.js';
import { MyDocumentsController } from './presentation/http/my-documents.controller.js';

@Module({
  imports: [EmployeesModule, ItemsModule, UsersModule, AuditLogsModule],
  controllers: [DocumentsController, MyDocumentsController],
  providers: [
    DocumentsApplicationService,
    { provide: DOCUMENTS_REPOSITORY, useClass: PrismaDocumentsRepository },
    {
      provide: DOCUMENT_STORAGE,
      useFactory: () =>
        new LocalDocumentStorage(
          process.env.DOCUMENTS_STORAGE_DIR || DEFAULT_DOCUMENTS_STORAGE_DIR,
        ),
    },
  ],
  exports: [DocumentsApplicationService, DOCUMENTS_REPOSITORY],
})
export class DocumentsModule {}
