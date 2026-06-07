import type { PlatformPublishResult, PlatformPerformanceItem } from './types.ts';
import type { OpsRowField } from './opsRowPresentation.ts';
import { platformConnection, platformMetaLine, type PlatformConnection } from './platformPresentation.ts';
import { platformOutcomeMeta } from './syncPresentation.ts';
import { formatPlatformAssistHint } from './movementBenchmark.ts';
import { operatorCopy } from './copy/operator.ts';

function integrationLabel(integrationClass: string): string {
  return integrationClass.replace(/_/g, ' ').toLowerCase();
}

export function channelRowSurface(connection: PlatformConnection): string {
  if (connection === 'blocked') return 'bg-status-error-bg/25';
  if (connection === 'inactive') return 'bg-silver-50/80';
  return '';
}

export function channelSecondaryMeta(platform: PlatformPublishResult): string {
  const parts: string[] = [platform.platformSlug, integrationLabel(platform.integrationClass)];
  const detail = platformMetaLine(platform);
  if (detail && detail !== platformOutcomeMeta(platform).label) {
    parts.push(detail);
  }
  return parts.join(' · ');
}

export function channelDesktopFields(
  platform: PlatformPublishResult,
  perf: PlatformPerformanceItem | null | undefined
): OpsRowField[] {
  const conn = platformConnection(platform);
  const publish = platformOutcomeMeta(platform);
  const fields: OpsRowField[] = [
    { label: operatorCopy.drawer.connection, value: conn.label },
    { label: operatorCopy.drawer.publishStatus, value: publish.label },
  ];

  if (perf) {
    if (perf.vehiclesListed > 0) {
      fields.push({
        label: operatorCopy.platforms.assetsListed,
        value: String(perf.vehiclesListed),
      });
    }
    if (perf.totalLeads > 0) {
      fields.push({
        label: operatorCopy.platforms.observedAssists,
        value: String(perf.totalLeads),
      });
    }
    if (perf.avgDaysOnPlatform != null) {
      fields.push({
        label: operatorCopy.platforms.avgExposure,
        value: `${Math.round(perf.avgDaysOnPlatform)}d`,
      });
    }
    const assistHint = formatPlatformAssistHint(perf);
    if (assistHint && fields.length < 5) {
      fields.push({ label: operatorCopy.platforms.signals, value: assistHint });
    }
  }

  return fields;
}

export function channelNeedsSetup(platform: PlatformPublishResult): boolean {
  const c = platformConnection(platform).connection;
  return c === 'blocked' || c === 'inactive';
}
