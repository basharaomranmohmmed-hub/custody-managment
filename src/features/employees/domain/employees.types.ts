import type { IsoDate } from '../../../shared/date/date-only.js';

export const EMPLOYEES_REPOSITORY = Symbol('EMPLOYEES_REPOSITORY');

export const EMPLOYEE_STATUSES = ['ACTIVE', 'SUSPENDED', 'TERMINATED'] as const;

export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export interface CreateEmployeeData {
  employee_no: string;
  full_name: string;
  department_id: number;
  job_title: string | null;
  phone: string | null;
  email: string | null;
  joined_at: IsoDate | null;
  created_by: number | null;
}

export interface UpdateEmployeeData {
  employee_no?: string;
  full_name?: string;
  department_id?: number;
  job_title?: string | null;
  phone?: string | null;
  email?: string | null;
  joined_at?: IsoDate | null;
  status?: EmployeeStatus;
  terminated_at?: IsoDate | null;
}

export interface DepartmentRef {
  id: number;
  uuid: string;
  name: string;
}

export interface EmployeeEntity {
  id: number;
  uuid: string;

  employee_no: string;
  full_name: string;
  department_id: number;
  department: DepartmentRef;
  job_title: string | null;
  phone: string | null;
  email: string | null;
  status: EmployeeStatus;
  joined_at: IsoDate | null;
  terminated_at: IsoDate | null;

  created_by: number | null;
  created_at: Date;
  updated_at: Date | null;

  deleted_at: Date | null;
  deleted_by: number | null;
}

export interface EmployeeFilters {
  department_id?: number;
  status?: EmployeeStatus;
  search?: string;
}

export interface EmployeesRepository {
  create(data: CreateEmployeeData): Promise<EmployeeEntity>;

  findAll(
    filters: EmployeeFilters,
    pagination: { skip: number; take: number },
  ): Promise<{ employees: EmployeeEntity[]; total: number }>;

  findById(id: number): Promise<EmployeeEntity | null>;

  findByIdForUpdate(id: number): Promise<EmployeeEntity | null>;

  findByUuid(uuid: string): Promise<EmployeeEntity | null>;

  findByUuidForUpdate(uuid: string): Promise<EmployeeEntity | null>;

  findByEmployeeNo(employeeNo: string): Promise<EmployeeEntity | null>;

  updateById(id: number, data: UpdateEmployeeData): Promise<EmployeeEntity>;

  countOpenPossessions(employeeId: number): Promise<number>;
}
