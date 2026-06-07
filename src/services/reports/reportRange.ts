/** Shared date-range parsing for operator period reports. */

export type ReportRangePreset = '7d' | '30d' | '90d';

export type ReportTimeWindow = {
  preset: ReportRangePreset;
  from: Date;
  to: Date;
};

export type ReportTimeWindowDto = {
  preset: ReportRangePreset;
  from: string;
  to: string;
};

const PRESET_DAYS: Record<ReportRangePreset, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export function parseReportRangePreset(
  raw: string | undefined,
  now: Date = new Date(),
): ReportTimeWindow {
  const preset: ReportRangePreset =
    raw === '30d' || raw === '90d' ? raw : '7d';
  const to = now;
  const from = new Date(to.getTime() - PRESET_DAYS[preset] * 24 * 60 * 60 * 1000);
  return { preset, from, to };
}

export function toReportTimeWindowDto(window: ReportTimeWindow): ReportTimeWindowDto {
  return {
    preset: window.preset,
    from: window.from.toISOString(),
    to: window.to.toISOString(),
  };
}

export function reportRangeWhere(window: ReportTimeWindow): { gte: Date; lt: Date } {
  return { gte: window.from, lt: window.to };
}
