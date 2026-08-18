import type { AdminBlockedDealerItem, AdminDealerAttentionItem } from '@/lib/api/admin.ts';
import type { OperationalIssue, IssueRemediationCapabilities } from '@/lib/models/operations.ts';

interface CachedIssueLifecycle {
  firstSeenAt: string;
  lastSeenAt: string;
  isResolved: boolean;
  resolvedAt?: string;
  cachedIssue?: OperationalIssue;
}

// In-memory cache for lifecycle persistence across fetches
const issueCache = new Map<string, CachedIssueLifecycle>();

// Exposed for tests only — this module-level cache otherwise persists for the life of
// the page, so tests need a way to isolate runs from one another.
export function __resetIssueLifecycleCacheForTests(): void {
  issueCache.clear();
}

const RECURRENCE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function normalizeReason(rawReason: string): string {
  const lower = rawReason.toLowerCase();
  if (lower.includes('auth') || lower.includes('token') || lower.includes('credential') || lower.includes('password')) return 'auth_failure';
  if (lower.includes('sync') || lower.includes('timeout') || lower.includes('network')) return 'sync_failure';
  if (lower.includes('config') || lower.includes('missing') || lower.includes('invalid')) return 'config_invalid';
  if (lower.includes('block') || lower.includes('suspend') || lower.includes('ban')) return 'account_suspended';
  return 'unknown_error';
}

function generateDeterministicId(type: 'triage' | 'blocked', dealerId: string, platformSlug: string | null, reason: string): string {
  const reasonCode = normalizeReason(reason);
  const seed = `${type}::${dealerId}::${platformSlug ?? 'system'}::${reasonCode}`;
  return `issue-${djb2Hash(seed)}`;
}

function resolveLifecycle(id: string, issuePayload: Omit<OperationalIssue, 'observedFirstSeenAt' | 'lastSeenAt' | 'isResolved' | 'resolvedAt'>): OperationalIssue {
  const now = new Date();
  const nowIso = now.toISOString();
  
  let lifecycle = issueCache.get(id);

  if (!lifecycle) {
    lifecycle = {
      firstSeenAt: nowIso,
      lastSeenAt: nowIso,
      isResolved: false,
    };
  } else {
    const lastSeen = new Date(lifecycle.lastSeenAt);
    
    // Check recurrence threshold
    if (now.getTime() - lastSeen.getTime() > RECURRENCE_THRESHOLD_MS) {
      // It's a new occurrence of the same signature
      lifecycle.firstSeenAt = nowIso;
    }
    
    lifecycle.lastSeenAt = nowIso;
    lifecycle.isResolved = false;
    lifecycle.resolvedAt = undefined;
  }

  const completeIssue: OperationalIssue = {
    ...issuePayload,
    observedFirstSeenAt: lifecycle.firstSeenAt,
    lastSeenAt: lifecycle.lastSeenAt,
    isResolved: lifecycle.isResolved,
    resolvedAt: lifecycle.resolvedAt,
  };

  lifecycle.cachedIssue = completeIssue;
  issueCache.set(id, lifecycle);

  return completeIssue;
}

function inferTriageRemediation(firstItem: AdminDealerAttentionItem): IssueRemediationCapabilities | undefined {
  if (!firstItem.nextAction) return undefined;
  return {
    isRetryable: firstItem.nextAction.includes('retry') || firstItem.nextAction.includes('sync'),
    requiresReauth: firstItem.nextAction.includes('auth'),
    isBulkSafe: true,
    isDestructive: false,
  };
}

function inferBlockedRemediation(blocked: AdminBlockedDealerItem): IssueRemediationCapabilities | undefined {
  if (!blocked.nextAction) return undefined;
  return {
    isRetryable: false,
    requiresReauth: false,
    isBulkSafe: false,
    isDestructive: false,
  };
}

export function buildOperationalIssues(
  triageItems: AdminDealerAttentionItem[],
  blockedItems: AdminBlockedDealerItem[]
): OperationalIssue[] {
  const issues: OperationalIssue[] = [];
  const activeIds = new Set<string>();
  
  const triageGroups = new Map<string, AdminDealerAttentionItem[]>();
  
  for (const item of triageItems) {
    const reasonCode = normalizeReason(item.reason);
    const key = `${item.dealerId}::${item.platformSlug || 'system'}::${reasonCode}`;
    const group = triageGroups.get(key) || [];
    group.push(item);
    triageGroups.set(key, group);
  }
  
  for (const group of triageGroups.values()) {
    const first = group[0];
    const isPlatformIssue = first.platformSlug != null;
    const reasonCode = normalizeReason(first.reason);
    const vehicleIds = Array.from(new Set(
      group.map(i => (i as { vehicleId?: string }).vehicleId).filter((v): v is string => Boolean(v))
    ));
    const id = generateDeterministicId('triage', first.dealerId, first.platformSlug ?? null, first.reason);
    
    activeIds.add(id);

    issues.push(resolveLifecycle(id, {
      id,
      severity: first.severity === 'critical' ? 'critical' : first.severity === 'warning' ? 'warning' : 'info',
      category: isPlatformIssue ? 'sync' : 'system',
      status: 'active',
      scope: isPlatformIssue 
        ? { type: 'platform', dealerId: first.dealerId, platformSlug: first.platformSlug! }
        : { type: 'dealer', dealerId: first.dealerId },
      affectedCount: group.length,
      dealerId: first.dealerId,
      platformSlug: first.platformSlug ?? null,
      vehicleIds,
      reasonCode,
      remediation: inferTriageRemediation(first),
    }));
  }
  
  for (const blocked of blockedItems) {
    const id = generateDeterministicId('blocked', blocked.dealerId, blocked.platformSlug ?? null, blocked.reason || 'blocked');
    
    activeIds.add(id);

    issues.push(resolveLifecycle(id, {
      id,
      severity: blocked.severity === 'critical' ? 'critical' : blocked.severity === 'warning' ? 'warning' : 'info',
      category: 'config',
      status: 'active',
      scope: { type: 'dealer', dealerId: blocked.dealerId },
      affectedCount: 1,
      dealerId: blocked.dealerId,
      platformSlug: blocked.platformSlug ?? null,
      vehicleIds: [],
      reasonCode: normalizeReason(blocked.reason || 'blocked'),
      remediation: inferBlockedRemediation(blocked),
    }));
  }
  
  // Handle resolved issues (in cache but not in current payload)
  const nowIso = new Date().toISOString();
  for (const [id, lifecycle] of issueCache.entries()) {
    if (!activeIds.has(id)) {
      if (!lifecycle.isResolved) {
        // Just transitioned to resolved
        lifecycle.isResolved = true;
        lifecycle.resolvedAt = nowIso;
        if (lifecycle.cachedIssue) {
          lifecycle.cachedIssue.isResolved = true;
          lifecycle.cachedIssue.resolvedAt = nowIso;
          lifecycle.cachedIssue.status = 'resolved';
        }
      }
      // Include it in the output so the UI can render resolved items (History)
      if (lifecycle.cachedIssue) {
        issues.push(lifecycle.cachedIssue);
      }
    }
  }

  return issues;
}
