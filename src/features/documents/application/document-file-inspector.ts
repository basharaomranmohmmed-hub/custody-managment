import { HttpStatus } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { AppException } from '../../../shared/exceptions/app.exception.js';
import {
  ALLOWED_DOCUMENT_FILE_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
} from '../domain/documents.types.js';

export const MAX_FILE_NAME_LENGTH = 255;

const UNSAFE_FILE_NAME_CHARS = /[\p{Cc}\p{Cf}"<>:|?*]/gu;

export interface DocumentUpload {
  originalName: string;
  content: Uint8Array;
}

export interface InspectedDocumentFile {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export async function inspectDocumentFile({
  originalName,
  content,
}: DocumentUpload): Promise<InspectedDocumentFile> {
  if (content.byteLength === 0) {
    throw new AppException({
      message: 'الملف المرفوع فارغ',
      errorCode: 'DOCUMENT_FILE_EMPTY',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
  if (content.byteLength > MAX_DOCUMENT_SIZE_BYTES) {
    throw new AppException({
      message: `حجم الملف يتجاوز الحد المسموح ${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)} ميغابايت`,
      errorCode: 'DOCUMENT_FILE_TOO_LARGE',
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
    });
  }

  const fileName = sanitizeFileName(originalName);
  if (!fileName) {
    throw new AppException({
      message: 'اسم الملف فارغ أو يحتوي على محارف غير مدعومة فقط',
      errorCode: 'INVALID_FILE_NAME',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }

  const detected = await fileTypeFromBuffer(content);
  const extensions = detected && ALLOWED_DOCUMENT_FILE_TYPES[detected.mime];
  if (!detected || !extensions) {
    throw new AppException({
      message: 'يُقبل فقط ملفات PDF و JPEG و PNG',
      errorCode: 'DOCUMENT_FILE_TYPE_NOT_ALLOWED',
      statusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    });
  }
  if (!extensions.includes(extensionOf(fileName))) {
    throw new AppException({
      message: `محتوى الملف من نوع ${detected.mime}، لذلك يجب أن ينتهي اسمه بـ .${extensions.join(' أو .')}`,
      errorCode: 'DOCUMENT_FILE_EXTENSION_MISMATCH',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }

  return { fileName, mimeType: detected.mime, sizeBytes: content.byteLength };
}

export function sanitizeFileName(originalName: string): string {
  const baseName = originalName.split(/[\\/]/).pop() ?? '';
  const cleaned = baseName
    .normalize('NFC')
    .replace(UNSAFE_FILE_NAME_CHARS, '')
    .replace(/^[\s.]+|[\s.]+$/g, '');
  return truncateFileName(cleaned);
}

function truncateFileName(name: string): string {
  const chars = Array.from(name);
  if (chars.length <= MAX_FILE_NAME_LENGTH) return name;

  const dot = name.lastIndexOf('.');
  const extension = dot > 0 ? Array.from(name.slice(dot)) : [];
  const kept = extension.length < MAX_FILE_NAME_LENGTH ? extension : [];
  return (
    chars.slice(0, MAX_FILE_NAME_LENGTH - kept.length).join('') + kept.join('')
  );
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}
