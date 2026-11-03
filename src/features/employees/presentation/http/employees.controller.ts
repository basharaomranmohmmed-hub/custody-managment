import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../shared/auth/authenticated-user.js';
import { CurrentUser } from '../../../../shared/auth/current-user.decorator.js';
import { Roles } from '../../../../shared/auth/roles.decorator.js';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../auth/presentation/guards/roles.guard.js';
import { EmployeesApplicationService } from '../../application/employees.application.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { FilterEmployeeDto } from './dto/filter-employee.dto.js';
import { UpdateEmployeeStatusDto } from './dto/update-employee-status.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(
    private readonly employeesApplicationService: EmployeesApplicationService,
  ) {}

  @Post()
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  create(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesApplicationService.create(dto, user);
  }

  @Get()
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  findAll(@Query() filter: FilterEmployeeDto) {
    return this.employeesApplicationService.findAll(filter);
  }

  @Post('filter')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  filter(@Body() filter: FilterEmployeeDto) {
    return this.employeesApplicationService.findAll(filter);
  }

  @Get(':uuid')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.employeesApplicationService.findOne(uuid);
  }

  @Put(':uuid')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  update(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesApplicationService.update(uuid, dto);
  }

  @Put(':uuid/status')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  updateStatus(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: UpdateEmployeeStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesApplicationService.updateStatus(uuid, dto, user);
  }
}
