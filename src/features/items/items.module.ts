import { forwardRef, Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { CustodyTypesModule } from '../custody-types/custody-types.module.js';
import { IncidentReportsModule } from '../incident-reports/incident-reports.module.js';
import { ItemEventsModule } from '../item-events/item-events.module.js';
import { ItemsApplicationService } from './application/items.application.service.js';
import { ITEMS_REPOSITORY } from './domain/items.types.js';
import { PrismaItemsRepository } from './infrastructure/items.prisma.repository.js';
import { ItemsController } from './presentation/http/items.controller.js';

@Module({
  imports: [
    CustodyTypesModule,
    ItemEventsModule,
    AuditLogsModule,
    forwardRef(() => IncidentReportsModule),
  ],
  controllers: [ItemsController],
  providers: [
    ItemsApplicationService,
    { provide: ITEMS_REPOSITORY, useClass: PrismaItemsRepository },
  ],
  exports: [ItemsApplicationService, ITEMS_REPOSITORY],
})
export class ItemsModule {}
