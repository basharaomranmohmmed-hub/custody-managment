import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { DepartmentsApplicationService } from './application/departments.application.service.js';
import { DEPARTMENTS_REPOSITORY } from './domain/departments.types.js';
import { PrismaDepartmentsRepository } from './infrastructure/departments.prisma.repository.js';
import { DepartmentsController } from './presentation/http/departments.controller.js';

@Module({
  imports: [AuditLogsModule],
  controllers: [DepartmentsController],
  providers: [
    DepartmentsApplicationService,
    { provide: DEPARTMENTS_REPOSITORY, useClass: PrismaDepartmentsRepository },
  ],
  exports: [DepartmentsApplicationService, DEPARTMENTS_REPOSITORY],
})
export class DepartmentsModule {}
