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
import { CustodyTypesApplicationService } from '../../application/custody-types.application.service.js';
import { CreateCustodyTypeDto } from './dto/create-custody-type.dto.js';
import { FilterCustodyTypeDto } from './dto/filter-custody-type.dto.js';
import { UpdateCustodyTypeStatusDto } from './dto/update-custody-type-status.dto.js';
import { UpdateCustodyTypeDto } from './dto/update-custody-type.dto.js';

@Controller('custody-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustodyTypesController {
  constructor(
    private readonly custodyTypesApplicationService: CustodyTypesApplicationService,
  ) {}

  @Post()
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  create(
    @Body() dto: CreateCustodyTypeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.custodyTypesApplicationService.create(dto, user);
  }

  @Get()
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  findAll(@Query() filter: FilterCustodyTypeDto) {
    return this.custodyTypesApplicationService.findAll(filter);
  }

  @Post('filter')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  filter(@Body() filter: FilterCustodyTypeDto) {
    return this.custodyTypesApplicationService.findAll(filter);
  }

  @Get(':uuid')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.custodyTypesApplicationService.findOne(uuid);
  }

  @Put(':uuid')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  update(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: UpdateCustodyTypeDto,
  ) {
    return this.custodyTypesApplicationService.update(uuid, dto);
  }

  @Put(':uuid/status')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  updateActiveStatus(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: UpdateCustodyTypeStatusDto,
  ) {
    return this.custodyTypesApplicationService.updateActiveStatus(uuid, dto);
  }
}
