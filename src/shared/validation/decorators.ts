import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsInt, IsISO8601, Matches, Max, Min } from 'class-validator';

export const MAX_INT32 = 2_147_483_647;

export const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export const ToLowerCase = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value));

export const ToUpperCase = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value));

export const TrimToNull = () =>
  Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  });

export const ToBoolean = () =>
  Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  );

export const IsId = () => applyDecorators(IsInt(), Min(1), Max(MAX_INT32));

export const IsDateTimeWithZone = () =>
  applyDecorators(
    Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/, {
      message:
        '$property must be an ISO 8601 date-time with a time zone, e.g. 2026-10-17T09:30:00Z',
    }),
    IsISO8601({ strict: true }),
  );

export const IsDateOnly = () =>
  applyDecorators(
    Matches(/^\d{4}-\d{2}-\d{2}$/, {
      message: '$property must be a date in YYYY-MM-DD format',
    }),
    IsISO8601({ strict: true }),
  );
