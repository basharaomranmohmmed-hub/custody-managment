import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../shared/auth/authenticated-user.js';
import { CurrentUser } from '../../../../shared/auth/current-user.decorator.js';
import { EmployeeGuard } from '../../../auth/presentation/guards/employee.guard.js';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard.js';
import { DocumentsApplicationService } from '../../application/documents.application.service.js';
import { attachmentDisposition } from './attachment-disposition.js';

@Controller('me/documents')
@UseGuards(JwtAuthGuard, EmployeeGuard)
export class MyDocumentsController {
  constructor(
    private readonly documentsApplicationService: DocumentsApplicationService,
  ) {}

  @Get(':uuid')
  findOne(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsApplicationService.findMine(uuid, user);
  }

  @Get(':uuid/file')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'no-store')
  async download(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StreamableFile> {
    const { stream, fileName, mimeType, sizeBytes } =
      await this.documentsApplicationService.downloadMine(uuid, user);
    return new StreamableFile(stream, {
      type: mimeType,
      disposition: attachmentDisposition(fileName),
      length: sizeBytes,
    });
  }
}
