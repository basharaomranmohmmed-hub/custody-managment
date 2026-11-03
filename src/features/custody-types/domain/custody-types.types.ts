export const CUSTODY_TYPES_REPOSITORY = Symbol('CUSTODY_TYPES_REPOSITORY');

export interface CreateCustodyTypeData {
  name: string;
  description: string | null;
  created_by: number | null;
}

export interface UpdateCustodyTypeData {
  name?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface CustodyTypeEntity {
  id: number;
  uuid: string;

  name: string;
  description: string | null;
  is_active: boolean;

  created_by: number | null;
  created_at: Date;
  updated_at: Date | null;

  deleted_at: Date | null;
  deleted_by: number | null;
}

export interface CustodyTypeFilters {
  is_active?: boolean;
  search?: string;
}

export interface CustodyTypesRepository {
  create(data: CreateCustodyTypeData): Promise<CustodyTypeEntity>;

  findAll(
    filters: CustodyTypeFilters,
    pagination: { skip: number; take: number },
  ): Promise<{ custody_types: CustodyTypeEntity[]; total: number }>;

  findById(id: number): Promise<CustodyTypeEntity | null>;

  findByUuid(uuid: string): Promise<CustodyTypeEntity | null>;

  findByUuidForUpdate(uuid: string): Promise<CustodyTypeEntity | null>;

  findByName(name: string): Promise<CustodyTypeEntity | null>;

  updateById(
    id: number,
    data: UpdateCustodyTypeData,
  ): Promise<CustodyTypeEntity>;
}
