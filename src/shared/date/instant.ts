export const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

export function resolvePastInstant(
  value: Date | undefined,
  now: Date = new Date(),
): Date | null {
  if (!value) return now;
  if (value.getTime() > now.getTime() + CLOCK_SKEW_TOLERANCE_MS) return null;
  return value.getTime() > now.getTime() ? now : value;
}
