import { forwardRef, Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { UsersApplicationService } from './application/users.application.service.js';
import { USERS_REPOSITORY } from './domain/users.types.js';
import { PrismaUsersRepository } from './infrastructure/users.prisma.repository.js';
import { UsersController } from './presentation/http/users.controller.js';

@Module({
  imports: [forwardRef(() => EmployeesModule), AuditLogsModule],
  controllers: [UsersController],
  providers: [
    UsersApplicationService,
    { provide: USERS_REPOSITORY, useClass: PrismaUsersRepository },
  ],
  exports: [USERS_REPOSITORY],
})
export class UsersModule {}
