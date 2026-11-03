import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../core/database/prisma.service.js';
import { escapeLikePattern } from '../../../shared/database/escape-like-pattern.js';
import type {
  CreateIncidentReportData,
  IncidentReportEntity,
  IncidentReportFilters,
  IncidentReportsRepository,
  ResolveIncidentReportData,
  UpdateIncidentReportData,
} from '../domain/incident-reports.types.js';

const incidentReportInclude = {
  item: {
    select: {
      id: true,
      uuid: true,
      serial_no: true,
      custody_type: { select: { id: true, uuid: true, name: true } },
    },
  },
  employee: {
    select: { id: true, uuid: true, employee_no: true, full_name: true },
  },
  resolver: { select: { id: true, uuid: true, username: true } },
} satisfies Prisma.incident_reportsInclude;

@Injectable()
export class PrismaIncidentReportsRepository implements IncidentReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateIncidentReportData): Promise<IncidentReportEntity> {
    return this.prisma.db().incident_reports.create({
      data,
      include: incidentReportInclude,
    });
  }

  async findAll(
    filters: IncidentReportFilters,
    { skip, take }: { skip: number; take: number },
  ): Promise<{ incident_reports: IncidentReportEntity[]; total: number }> {
    const where: Prisma.incident_reportsWhereInput = {
      item_id: filters.item_id,
      employee_id: filters.employee_id,
      report_type: filters.report_type,
      status: filters.status,
      created_at:
        filters.created_from || filters.created_to
          ? { gte: filters.created_from, lte: filters.created_to }
          : undefined,
      description: filters.search
        ? { contains: escapeLikePattern(filters.search), mode: 'insensitive' }
        : undefined,
      deleted_at: null,
    };

    const [incident_reports, total] = await this.prisma.$transaction([
      this.prisma.incident_reports.findMany({
        where,
        include: incidentReportInclude,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.incident_reports.count({ where }),
    ]);

    return { incident_reports, total };
  }

  findByUuid(uuid: string): Promise<IncidentReportEntity | null> {
    return this.prisma.db().incident_reports.findFirst({
      where: { uuid, deleted_at: null },
      include: incidentReportInclude,
    });
  }

  async findByUuidForUpdate(
    uuid: string,
  ): Promise<IncidentReportEntity | null> {
    const locked = await this.prisma.db().$queryRaw<{ id: number }[]>`
      SELECT id FROM incident_reports
      WHERE uuid = ${uuid}::uuid AND deleted_at IS NULL
      FOR UPDATE`;
    return locked.length > 0 ? this.findByUuid(uuid) : null;
  }

  updateById(
    id: number,
    data: UpdateIncidentReportData,
  ): Promise<IncidentReportEntity> {
    return this.prisma.db().incident_reports.update({
      where: { id, status: 'OPEN' },
      data,
      include: incidentReportInclude,
    });
  }

  resolveById(
    id: number,
    data: ResolveIncidentReportData,
  ): Promise<IncidentReportEntity> {
    return this.prisma.db().incident_reports.update({
      where: { id, status: 'OPEN' },
      data: { ...data, status: 'RESOLVED' },
      include: incidentReportInclude,
    });
  }
}
