export const INCIDENT_REPORTS_REPOSITORY = Symbol(
  'INCIDENT_REPORTS_REPOSITORY',
);

export const INCIDENT_REPORT_TYPES = [
  'LOSS',
  'DAMAGE',
  'THEFT',
  'MALFUNCTION',
] as const;

export type IncidentReportType = (typeof INCIDENT_REPORT_TYPES)[number];

export const INCIDENT_REPORT_STATUSES = ['OPEN', 'RESOLVED'] as const;

export type IncidentReportStatus = (typeof INCIDENT_REPORT_STATUSES)[number];

export interface CreateIncidentReportData {
  item_id: number;
  employee_id: number;
  report_type: IncidentReportType;
  description: string;
  created_by: number | null;
}

export interface UpdateIncidentReportData {
  report_type?: IncidentReportType;
  description?: string;
}

export interface ResolveIncidentReportData {
  resolution: string;
  resolved_at: Date;
  resolved_by: number | null;
}

export interface ItemRef {
  id: number;
  uuid: string;
  serial_no: string;
  custody_type: { id: number; uuid: string; name: string };
}

export interface EmployeeRef {
  id: number;
  uuid: string;
  employee_no: string;
  full_name: string;
}

export interface UserRef {
  id: number;
  uuid: string;
  username: string;
}

export interface IncidentReportEntity {
  id: number;
  uuid: string;

  item_id: number;
  item: ItemRef;
  employee_id: number;
  employee: EmployeeRef;
  report_type: IncidentReportType;
  description: string;
  status: IncidentReportStatus;
  resolution: string | null;
  resolved_at: Date | null;
  resolved_by: number | null;
  resolver: UserRef | null;

  created_by: number | null;
  created_at: Date;
  updated_at: Date | null;

  deleted_at: Date | null;
  deleted_by: number | null;
}

export interface IncidentReportFilters {
  item_id?: number;
  employee_id?: number;
  report_type?: IncidentReportType;
  status?: IncidentReportStatus;
  created_from?: Date;
  created_to?: Date;
  search?: string;
}

export interface IncidentReportsRepository {
  create(data: CreateIncidentReportData): Promise<IncidentReportEntity>;

  findAll(
    filters: IncidentReportFilters,
    pagination: { skip: number; take: number },
  ): Promise<{ incident_reports: IncidentReportEntity[]; total: number }>;

  findByUuid(uuid: string): Promise<IncidentReportEntity | null>;

  findByUuidForUpdate(uuid: string): Promise<IncidentReportEntity | null>;

  updateById(
    id: number,
    data: UpdateIncidentReportData,
  ): Promise<IncidentReportEntity>;

  resolveById(
    id: number,
    data: ResolveIncidentReportData,
  ): Promise<IncidentReportEntity>;
}
