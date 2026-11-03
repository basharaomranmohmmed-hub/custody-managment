import { forwardRef, Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { DepartmentsModule } from '../departments/departments.module.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { ItemEventsModule } from '../item-events/item-events.module.js';
import { ItemsModule } from '../items/items.module.js';
import { PossessionsApplicationService } from './application/possessions.application.service.js';
import { POSSESSIONS_REPOSITORY } from './domain/possessions.types.js';
import { PrismaPossessionsRepository } from './infrastructure/possessions.prisma.repository.js';
import { PossessionsController } from './presentation/http/possessions.controller.js';

@Module({
  imports: [
    forwardRef(() => ItemsModule),
    EmployeesModule,
    DepartmentsModule,
    ItemEventsModule,
    AuditLogsModule,
  ],
  controllers: [PossessionsController],
  providers: [
    PossessionsApplicationService,
    { provide: POSSESSIONS_REPOSITORY, useClass: PrismaPossessionsRepository },
  ],
  exports: [PossessionsApplicationService, POSSESSIONS_REPOSITORY],
})
export class PossessionsModule {}
