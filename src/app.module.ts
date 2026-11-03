import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuditLogsModule } from './features/audit-logs/audit-logs.module.js';
import { AuthModule } from './features/auth/auth.module.js';
import { CustodyTypesModule } from './features/custody-types/custody-types.module.js';
import { DepartmentsModule } from './features/departments/departments.module.js';
import { DocumentsModule } from './features/documents/documents.module.js';
import { EmployeesModule } from './features/employees/employees.module.js';
import { IncidentReportsModule } from './features/incident-reports/incident-reports.module.js';
import { ItemEventsModule } from './features/item-events/item-events.module.js';
import { ItemsModule } from './features/items/items.module.js';
import { PossessionsModule } from './features/possessions/possessions.module.js';
import { UsersModule } from './features/users/users.module.js';
import { PrismaModule } from './core/database/prisma.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

const observeAppKey = process.env.OBSERVE_APP_KEY;
const observeAppSecret = process.env.OBSERVE_APP_SECRET;

export const observeEnabled = Boolean(observeAppKey && observeAppSecret);

const observeImports =
  observeAppKey && observeAppSecret
    ? [
        ObserveModule.forRoot({
          appKey: observeAppKey,
          appSecret: observeAppSecret,
          serviceId: 'my-nest-project',
        }),
      ]
    : [];

@Module({
  imports: [
    ...observeImports,
    PrismaModule,
    AuthModule,
    UsersModule,
    AuditLogsModule,
    DepartmentsModule,
    EmployeesModule,
    CustodyTypesModule,
    ItemsModule,
    ItemEventsModule,
    PossessionsModule,
    IncidentReportsModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
