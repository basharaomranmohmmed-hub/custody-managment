import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/roles.decorator.js';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../auth/presentation/guards/roles.guard.js';
import { AuditLogsApplicationService } from '../../application/audit-logs.application.service.js';
import { FilterAuditLogDto } from './dto/filter-audit-log.dto.js';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogsController {
  constructor(
    private readonly auditLogsApplicationService: AuditLogsApplicationService,
  ) {}

  @Get()
  @Roles('ADMIN', 'AUDITOR')
  findAll(@Query() filter: FilterAuditLogDto) {
    return this.auditLogsApplicationService.findAll(filter);
  }

  @Post('filter')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'AUDITOR')
  filter(@Body() filter: FilterAuditLogDto) {
    return this.auditLogsApplicationService.findAll(filter);
  }

  @Get(':uuid')
  @Roles('ADMIN', 'AUDITOR')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.auditLogsApplicationService.findOne(uuid);
  }
}
