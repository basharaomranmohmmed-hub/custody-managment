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
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard.js';
import { AdminGuard } from '../../../auth/presentation/guards/admin.guard.js';
import { UsersApplicationService } from '../../application/users.application.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { FilterUserDto } from './dto/filter-user.dto.js';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Controller('users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UsersController {
  constructor(
    private readonly usersApplicationService: UsersApplicationService,
  ) {}

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersApplicationService.create(dto, user);
  }

  @Get()
  findAll(@Query() filter: FilterUserDto) {
    return this.usersApplicationService.findAll(filter);
  }

  @Post('filter')
  @HttpCode(HttpStatus.OK)
  filter(@Body() filter: FilterUserDto) {
    return this.usersApplicationService.findAll(filter);
  }

  @Get(':uuid')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.usersApplicationService.findOne(uuid);
  }

  @Put(':uuid')
  update(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersApplicationService.update(uuid, dto);
  }

  @Put(':uuid/status')
  updateActiveStatus(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersApplicationService.updateActiveStatus(uuid, dto);
  }

  @Put(':uuid/password')
  resetPassword(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: ResetUserPasswordDto,
  ) {
    return this.usersApplicationService.resetPassword(uuid, dto);
  }
}
