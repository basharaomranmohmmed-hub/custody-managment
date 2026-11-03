import { forwardRef, Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { ItemsModule } from '../items/items.module.js';
import { PossessionsModule } from '../possessions/possessions.module.js';
import { IncidentReportsApplicationService } from './application/incident-reports.application.service.js';
import { INCIDENT_REPORTS_REPOSITORY } from './domain/incident-reports.types.js';
import { PrismaIncidentReportsRepository } from './infrastructure/incident-reports.prisma.repository.js';
import { IncidentReportsController } from './presentation/http/incident-reports.controller.js';

@Module({
  imports: [
    forwardRef(() => ItemsModule),
    EmployeesModule,
    forwardRef(() => PossessionsModule),
    AuditLogsModule,
  ],
  controllers: [IncidentReportsController],
  providers: [
    IncidentReportsApplicationService,
    {
      provide: INCIDENT_REPORTS_REPOSITORY,
      useClass: PrismaIncidentReportsRepository,
    },
  ],
  exports: [IncidentReportsApplicationService, INCIDENT_REPORTS_REPOSITORY],
})
export class IncidentReportsModule {}
