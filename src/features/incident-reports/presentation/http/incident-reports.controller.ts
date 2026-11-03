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
import { IncidentReportsApplicationService } from '../../application/incident-reports.application.service.js';
import { CreateIncidentReportDto } from './dto/create-incident-report.dto.js';
import { FilterIncidentReportDto } from './dto/filter-incident-report.dto.js';
import { ResolveIncidentReportDto } from './dto/resolve-incident-report.dto.js';
import { UpdateIncidentReportDto } from './dto/update-incident-report.dto.js';

@Controller('incident-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IncidentReportsController {
  constructor(
    private readonly incidentReportsApplicationService: IncidentReportsApplicationService,
  ) {}

  @Post()
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  create(
    @Body() dto: CreateIncidentReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incidentReportsApplicationService.create(dto, user);
  }

  @Get()
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  findAll(@Query() filter: FilterIncidentReportDto) {
    return this.incidentReportsApplicationService.findAll(filter);
  }

  @Post('filter')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  filter(@Body() filter: FilterIncidentReportDto) {
    return this.incidentReportsApplicationService.findAll(filter);
  }

  @Get(':uuid')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.incidentReportsApplicationService.findOne(uuid);
  }

  @Put(':uuid')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  update(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: UpdateIncidentReportDto,
  ) {
    return this.incidentReportsApplicationService.update(uuid, dto);
  }

  @Post(':uuid/resolve')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  resolve(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: ResolveIncidentReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incidentReportsApplicationService.resolve(uuid, dto, user);
  }
}
