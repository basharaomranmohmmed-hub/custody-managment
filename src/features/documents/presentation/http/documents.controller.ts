import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedUser } from '../../../../shared/auth/authenticated-user.js';
import { CurrentUser } from '../../../../shared/auth/current-user.decorator.js';
import { Roles } from '../../../../shared/auth/roles.decorator.js';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../auth/presentation/guards/roles.guard.js';
import { DocumentsApplicationService } from '../../application/documents.application.service.js';
import { MAX_DOCUMENT_SIZE_BYTES } from '../../domain/documents.types.js';
import { attachmentDisposition } from './attachment-disposition.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { FilterDocumentDto } from './dto/filter-document.dto.js';
import { LinkItemEventsDto } from './dto/link-item-events.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';

interface UploadedDocumentFile {
  originalname: string;
  buffer: Buffer;
}

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(
    private readonly documentsApplicationService: DocumentsApplicationService,
  ) {}

  @Post()
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_DOCUMENT_SIZE_BYTES,
        files: 1,
        fields: 10,
        fieldSize: 1024,
      },
      defParamCharset: 'utf8',
    }),
  )
  create(
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: UploadedDocumentFile | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsApplicationService.create(
      dto,
      file && { originalName: file.originalname, content: file.buffer },
      user,
    );
  }

  @Get()
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  findAll(@Query() filter: FilterDocumentDto) {
    return this.documentsApplicationService.findAll(filter);
  }

  @Post('filter')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  filter(@Body() filter: FilterDocumentDto) {
    return this.documentsApplicationService.findAll(filter);
  }

  @Get(':uuid')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.documentsApplicationService.findOne(uuid);
  }

  @Get(':uuid/file')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER', 'AUDITOR')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'no-store')
  async download(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<StreamableFile> {
    const { stream, fileName, mimeType, sizeBytes } =
      await this.documentsApplicationService.download(uuid);
    return new StreamableFile(stream, {
      type: mimeType,
      disposition: attachmentDisposition(fileName),
      length: sizeBytes,
    });
  }

  @Put(':uuid')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  update(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsApplicationService.update(uuid, dto);
  }

  @Delete(':uuid')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  remove(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsApplicationService.remove(uuid, user);
  }

  @Post(':uuid/item-events')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  linkItemEvents(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: LinkItemEventsDto,
  ) {
    return this.documentsApplicationService.linkItemEvents(uuid, dto);
  }

  @Delete(':uuid/item-events/:itemEventUuid')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  unlinkItemEvent(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Param('itemEventUuid', ParseUUIDPipe) itemEventUuid: string,
  ) {
    return this.documentsApplicationService.unlinkItemEvent(
      uuid,
      itemEventUuid,
    );
  }
}
