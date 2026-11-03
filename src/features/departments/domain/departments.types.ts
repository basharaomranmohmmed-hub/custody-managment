export const DEPARTMENTS_REPOSITORY = Symbol('DEPARTMENTS_REPOSITORY');

export interface CreateDepartmentData {
  name: string;
  created_by: number | null;
}

export interface UpdateDepartmentData {
  name?: string;
  is_active?: boolean;
}

export interface DepartmentEntity {
  id: number;
  uuid: string;

  name: string;
  is_active: boolean;

  created_by: number | null;
  created_at: Date;
  updated_at: Date | null;

  deleted_at: Date | null;
  deleted_by: number | null;
}

export interface DepartmentFilters {
  is_active?: boolean;
  search?: string;
}

export interface DepartmentsRepository {
  create(data: CreateDepartmentData): Promise<DepartmentEntity>;

  findAll(
    filters: DepartmentFilters,
    pagination: { skip: number; take: number },
  ): Promise<{ departments: DepartmentEntity[]; total: number }>;

  findById(id: number): Promise<DepartmentEntity | null>;

  findByUuid(uuid: string): Promise<DepartmentEntity | null>;

  findByUuidForUpdate(uuid: string): Promise<DepartmentEntity | null>;

  findByName(name: string): Promise<DepartmentEntity | null>;

  updateById(id: number, data: UpdateDepartmentData): Promise<DepartmentEntity>;

  countNonTerminatedEmployees(departmentId: number): Promise<number>;
}
