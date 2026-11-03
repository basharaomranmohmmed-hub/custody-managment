export type IsoDate = string;

const HOUR_MS = 60 * 60 * 1000;
const EARLIEST_TIME_ZONE_OFFSET_MS = 14 * HOUR_MS;
const LATEST_TIME_ZONE_OFFSET_MS = -12 * HOUR_MS;

export function toDbDate(value: IsoDate | null | undefined): Date | null | undefined {
  if (value === null || value === undefined) return value;
  return new Date(`${value}T00:00:00.000Z`);
}

export function fromDbDate(value: Date | null): IsoDate | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function latestCalendarDate(instant: Date): IsoDate {
  return calendarDateAtOffset(instant, EARLIEST_TIME_ZONE_OFFSET_MS);
}

export function earliestCalendarDate(instant: Date): IsoDate {
  return calendarDateAtOffset(instant, LATEST_TIME_ZONE_OFFSET_MS);
}

export function latestPossibleToday(now: Date = new Date()): IsoDate {
  return latestCalendarDate(now);
}

function calendarDateAtOffset(instant: Date, offsetMs: number): IsoDate {
  return new Date(instant.getTime() + offsetMs).toISOString().slice(0, 10);
}
