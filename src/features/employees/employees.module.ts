import { forwardRef, Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { DepartmentsModule } from '../departments/departments.module.js';
import { UsersModule } from '../users/users.module.js';
import { EmployeesApplicationService } from './application/employees.application.service.js';
import { EMPLOYEES_REPOSITORY } from './domain/employees.types.js';
import { PrismaEmployeesRepository } from './infrastructure/employees.prisma.repository.js';
import { EmployeesController } from './presentation/http/employees.controller.js';

@Module({
  imports: [DepartmentsModule, AuditLogsModule, forwardRef(() => UsersModule)],
  controllers: [EmployeesController],
  providers: [
    EmployeesApplicationService,
    { provide: EMPLOYEES_REPOSITORY, useClass: PrismaEmployeesRepository },
  ],
  exports: [EmployeesApplicationService, EMPLOYEES_REPOSITORY],
})
export class EmployeesModule {}
