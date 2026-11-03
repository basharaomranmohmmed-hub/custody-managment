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
import { ItemEventsApplicationService } from '../../application/item-events.application.service.js';
import { FilterItemEventDto } from './dto/filter-item-event.dto.js';

@Controller('item-events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ItemEventsController {
  constructor(
    private readonly itemEventsApplicationService: ItemEventsApplicationService,
  ) {}

  @Get()
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  findAll(@Query() filter: FilterItemEventDto) {
    return this.itemEventsApplicationService.findAll(filter);
  }

  @Post('filter')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  filter(@Body() filter: FilterItemEventDto) {
    return this.itemEventsApplicationService.findAll(filter);
  }

  @Get(':uuid')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.itemEventsApplicationService.findOne(uuid);
  }
}
