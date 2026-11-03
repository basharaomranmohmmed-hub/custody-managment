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
import { ItemsApplicationService } from '../../application/items.application.service.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { FilterItemDto } from './dto/filter-item.dto.js';
import { UpdateItemStatusDto } from './dto/update-item-status.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';

@Controller('items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ItemsController {
  constructor(
    private readonly itemsApplicationService: ItemsApplicationService,
  ) {}

  @Post()
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  create(@Body() dto: CreateItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.itemsApplicationService.create(dto, user);
  }

  @Get()
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  findAll(@Query() filter: FilterItemDto) {
    return this.itemsApplicationService.findAll(filter);
  }

  @Post('filter')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  filter(@Body() filter: FilterItemDto) {
    return this.itemsApplicationService.findAll(filter);
  }

  @Get(':uuid')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.itemsApplicationService.findOne(uuid);
  }

  @Put(':uuid')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  update(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.itemsApplicationService.update(uuid, dto);
  }

  @Put(':uuid/status')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  updateStatus(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: UpdateItemStatusDto,
  ) {
    return this.itemsApplicationService.updateStatus(uuid, dto);
  }
}
