import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { CustodyTypesApplicationService } from './application/custody-types.application.service.js';
import { CUSTODY_TYPES_REPOSITORY } from './domain/custody-types.types.js';
import { PrismaCustodyTypesRepository } from './infrastructure/custody-types.prisma.repository.js';
import { CustodyTypesController } from './presentation/http/custody-types.controller.js';

@Module({
  imports: [AuditLogsModule],
  controllers: [CustodyTypesController],
  providers: [
    CustodyTypesApplicationService,
    {
      provide: CUSTODY_TYPES_REPOSITORY,
      useClass: PrismaCustodyTypesRepository,
    },
  ],
  exports: [CustodyTypesApplicationService, CUSTODY_TYPES_REPOSITORY],
})
export class CustodyTypesModule {}
