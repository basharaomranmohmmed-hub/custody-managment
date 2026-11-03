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
import { DepartmentsApplicationService } from '../../application/departments.application.service.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { FilterDepartmentDto } from './dto/filter-department.dto.js';
import { UpdateDepartmentStatusDto } from './dto/update-department-status.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';

@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentsController {
  constructor(
    private readonly departmentsApplicationService: DepartmentsApplicationService,
  ) {}

  @Post()
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  create(
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.departmentsApplicationService.create(dto, user);
  }

  @Get()
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  findAll(@Query() filter: FilterDepartmentDto) {
    return this.departmentsApplicationService.findAll(filter);
  }

  @Post('filter')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  filter(@Body() filter: FilterDepartmentDto) {
    return this.departmentsApplicationService.findAll(filter);
  }

  @Get(':uuid')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.departmentsApplicationService.findOne(uuid);
  }

  @Put(':uuid')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  update(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsApplicationService.update(uuid, dto);
  }

  @Put(':uuid/status')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  updateActiveStatus(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: UpdateDepartmentStatusDto,
  ) {
    return this.departmentsApplicationService.updateActiveStatus(uuid, dto);
  }
}
