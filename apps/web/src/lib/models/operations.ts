export type OperationsScope =
  | { type: 'vehicle'; vehicleId: string }
  | { type: 'platform'; dealerId: string; platformSlug: string }
  | { type: 'dealer'; dealerId: string }
  | { type: 'global' };

export interface IssueRemediationCapabilities {
  isRetryable: boolean;
  requiresReauth: boolean;
  isBulkSafe: boolean;
  isDestructive: boolean;
  actionEndpoint?: string;
}

export interface OperationalIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'auth' | 'sync' | 'config' | 'system';
  status: 'active' | 'resolved' | 'ignored';
  scope: OperationsScope;
  affectedCount: number;
  dealerId: string | null;
  platformSlug: string | null;
  vehicleIds: string[];
  reasonCode?: string;
  observedFirstSeenAt: string;
  lastSeenAt: string;
  isResolved: boolean;
  resolvedAt?: string;
  remediation?: IssueRemediationCapabilities;
}
