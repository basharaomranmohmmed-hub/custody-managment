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
import type { AuthenticatedUser } from '../../../../shared/auth/authenticated-user.js';
import { CurrentUser } from '../../../../shared/auth/current-user.decorator.js';
import { Roles } from '../../../../shared/auth/roles.decorator.js';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../auth/presentation/guards/roles.guard.js';
import { PossessionsApplicationService } from '../../application/possessions.application.service.js';
import { CreatePossessionDto } from './dto/create-possession.dto.js';
import { FilterPossessionDto } from './dto/filter-possession.dto.js';
import { ReturnPossessionDto } from './dto/return-possession.dto.js';

@Controller('possessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PossessionsController {
  constructor(
    private readonly possessionsApplicationService: PossessionsApplicationService,
  ) {}

  @Post()
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  create(
    @Body() dto: CreatePossessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.possessionsApplicationService.create(dto, user);
  }

  @Get()
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  findAll(@Query() filter: FilterPossessionDto) {
    return this.possessionsApplicationService.findAll(filter);
  }

  @Post('filter')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  filter(@Body() filter: FilterPossessionDto) {
    return this.possessionsApplicationService.findAll(filter);
  }

  @Get(':uuid')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.possessionsApplicationService.findOne(uuid);
  }

  @Post(':uuid/return')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  returnPossession(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: ReturnPossessionDto,
  ) {
    return this.possessionsApplicationService.returnPossession(uuid, dto);
  }
}
