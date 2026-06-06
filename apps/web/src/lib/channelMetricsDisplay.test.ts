import { describe, expect, it } from 'vitest';
import {
  channelMetricConfidenceLabel,
  formatChannelMetricsDisplay,
  formatChannelMetricsLine,
  formatPlatformAssistHint,
  formatPlatformChannelHint,
} from './movementBenchmark.ts';
import type { ChannelMetrics, PlatformPerformanceItem } from './types.ts';

const BASE_PLATFORM: PlatformPerformanceItem = {
  platformSlug: 'consumer-marketplace',
  vehiclesListed: 3,
  vehiclesSold: 0,
  avgDaysToMove: null,
  medianDaysToMove: null,
  totalLeads: 0,
  leadsPerVehicle: null,
  confidence: 'INSUFFICIENT',
  sampleSize: 0,
  observedAssistLabel: 'not enough comparable data',
  channelMetrics: {},
  computedAt: '2026-06-05T12:00:00.000Z',
};

describe('channelMetricConfidenceLabel', () => {
  it('maps confidence to conservative copy', () => {
    expect(channelMetricConfidenceLabel('observed_first_party')).toBe('observed');
    expect(channelMetricConfidenceLabel('platform_reported')).toBe('reported');
    expect(channelMetricConfidenceLabel('manual_imported')).toBe('imported');
    expect(channelMetricConfidenceLabel('unavailable')).toBe('unavailable');
  });
});

describe('formatChannelMetricsDisplay', () => {
  it('returns nulls for empty metrics', () => {
    expect(formatChannelMetricsDisplay(undefined)).toEqual({ primary: null, secondary: null });
    expect(formatChannelMetricsDisplay({})).toEqual({ primary: null, secondary: null });
  });

  it('uses compact line and single source note when confidence is uniform', () => {
    const metrics: ChannelMetrics = {
      views: { count: 1292, confidence: 'observed_first_party' },
      detailViews: { count: 86, confidence: 'observed_first_party' },
      inquiries: { count: 12, confidence: 'observed_first_party' },
    };
    const display = formatChannelMetricsDisplay(metrics);
    expect(display.primary).toContain('1,292');
    expect(display.primary).toContain('86 detail views');
    expect(display.primary).toContain('12 inquiries');
    expect(display.secondary).toBe('observed activity');
  });

  it('labels each metric when confidence is mixed', () => {
    const metrics: ChannelMetrics = {
      reportedClicks: { count: 318, confidence: 'platform_reported' },
      inquiries: { count: 4, confidence: 'observed_first_party' },
    };
    const display = formatChannelMetricsDisplay(metrics);
    expect(display.primary).toContain('318 reported clicks (reported)');
    expect(display.primary).toContain('4 inquiries (observed)');
    expect(display.secondary).toContain('Mixed measurement sources');
  });

  it('handles reported-only metrics', () => {
    const display = formatChannelMetricsDisplay({
      reportedClicks: { count: 50, confidence: 'platform_reported' },
    });
    expect(display.primary).toBe('50 reported clicks');
    expect(display.secondary).toBe('reported activity');
  });
});

describe('formatChannelMetricsLine', () => {
  it('returns primary line only', () => {
    const line = formatChannelMetricsLine({
      inquiries: { count: 3, confidence: 'observed_first_party' },
    });
    expect(line).toBe('3 inquiries');
  });
});

describe('formatPlatformAssistHint', () => {
  it('prefers channel metrics over lead assists', () => {
    const hint = formatPlatformAssistHint({
      ...BASE_PLATFORM,
      totalLeads: 5,
      channelMetrics: {
        detailViews: { count: 20, confidence: 'observed_first_party' },
      },
    });
    expect(hint).toContain('20 detail views');
    expect(hint).toContain('observed activity');
    expect(hint).not.toContain('observed assist');
  });

  it('falls back to move/assist copy when no channel metrics', () => {
    const hint = formatPlatformAssistHint({
      ...BASE_PLATFORM,
      totalLeads: 2,
      avgDaysToMove: 18,
      confidence: 'LOW',
    });
    expect(hint).toContain('Avg move 18d');
    expect(hint).toContain('2 observed assists');
    expect(hint).toContain('low confidence');
  });

  it('returns null when there is no activity', () => {
    expect(formatPlatformAssistHint(BASE_PLATFORM)).toBeNull();
  });
});

describe('formatPlatformChannelHint', () => {
  it('returns primary line without footnote', () => {
    const hint = formatPlatformChannelHint({
      ...BASE_PLATFORM,
      channelMetrics: {
        views: { count: 100, confidence: 'platform_reported' },
        inquiries: { count: 2, confidence: 'observed_first_party' },
      },
    });
    expect(hint).toContain('(reported)');
    expect(hint).toContain('(observed)');
    expect(hint).not.toContain('Mixed measurement');
  });
});
