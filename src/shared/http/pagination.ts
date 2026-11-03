import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export const MAX_PAGE_LIMIT = 100;

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export interface Pagination {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export function resolvePagination({ page, limit }: Pagination): {
  skip: number;
  take: number;
} {
  const currentPage = page && page > 0 ? page : 1;
  const take =
    limit && limit > 0 ? Math.min(limit, MAX_PAGE_LIMIT) : MAX_PAGE_LIMIT;
  return { skip: (currentPage - 1) * take, take };
}
