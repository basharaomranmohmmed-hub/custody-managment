import { Module } from '@nestjs/common';
import { AuditLogsApplicationService } from './application/audit-logs.application.service.js';
import { AuditTrail } from './application/audit-trail.js';
import { AUDIT_LOGS_REPOSITORY } from './domain/audit-logs.types.js';
import { PrismaAuditLogsRepository } from './infrastructure/audit-logs.prisma.repository.js';
import { AuditLogsController } from './presentation/http/audit-logs.controller.js';

@Module({
  controllers: [AuditLogsController],
  providers: [
    AuditLogsApplicationService,
    AuditTrail,
    { provide: AUDIT_LOGS_REPOSITORY, useClass: PrismaAuditLogsRepository },
  ],
  exports: [AuditTrail],
})
export class AuditLogsModule {}
