import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthenticatedUser } from '../../../../shared/auth/authenticated-user.js';
import { CurrentUser } from '../../../../shared/auth/current-user.decorator.js';
import { Roles } from '../../../../shared/auth/roles.decorator.js';
import { AuthApplicationService } from '../../application/auth.application.service.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authApplicationService: AuthApplicationService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  login(@Body() dto: LoginDto) {
    return this.authApplicationService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authApplicationService.getProfile(user);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR', 'EMPLOYEE')
  updateProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.authApplicationService.updateProfile(dto, user);
  }

  @Put('me/password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR', 'EMPLOYEE')
  changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.authApplicationService.changePassword(dto, user);
  }
}
