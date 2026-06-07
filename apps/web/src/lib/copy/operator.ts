/** Shell copy — vertical-neutral channel operations console */

export const operatorCopy = {
  app: {
    title: 'Operator Console',
    tagline: 'Pick an organization, then manage channels, queue, and inventory.',
  },
  scope: {
    term: 'Organization',
    pickerTitle: 'Choose an organization',
    searchPlaceholder: 'Search organization name or ID…',
    pasteIdPlaceholder: 'Paste organization ID…',
    noResults: 'No organizations found',
    changeAction: 'Change organization',
    manualOpen: 'Open',
  },
  channels: {
    singular: 'channel',
    plural: 'channels',
    all: 'All channels',
  },
  platforms: {
    title: 'Platforms',
    searchPlaceholder: 'Search channels',
    loading: 'Loading channels…',
    emptyFilter: 'No channels match your filters.',
    noneConfigured: 'No channels configured yet.',
    fixSetup: 'Fix setup',
    openQueue: 'Open queue',
  },
  queue: {
    title: 'Queue',
    subtitle: 'Pending publishes, updates, and removals across all channels.',
    searchPlaceholder: 'Search asset, ref #, channel',
    empty: 'Nothing waiting — all channels are up to date.',
    emptyFilter: 'No tasks match your filters.',
    loading: 'Loading tasks…',
    details: 'Details',
  },
  history: {
    title: 'History',
    searchPlaceholder: 'Search activity',
    empty: 'No activity recorded yet.',
    readOnlyNote: 'Read-only log. To fix issues, open Queue.',
    recorded: 'Recorded',
  },
  asset: {
    singular: 'asset',
    plural: 'assets',
    refLabel: 'Ref #',
    unknown: 'Unknown asset',
  },
  taskActions: {
    publish: 'Publish',
    update: 'Update',
    remove: 'Remove',
    delist: 'Delist',
  },
  connection: {
    inactive: 'Inactive',
    setupNeeded: 'Setup needed',
    connected: 'Connected',
    blocked: 'Blocked',
    updating: 'Updating',
  },
  drawer: {
    connection: 'Connection',
    publishStatus: 'Publish status',
    openQueue: 'Open queue →',
    viewHistory: 'View history →',
    accountSetup: 'Account setup',
    accountLoading: 'Account details loading…',
    action: 'Action',
    channel: 'Channel',
    status: 'Status',
    policy: 'Policy',
    blockedBecause: 'Blocked because',
    needsApproval: 'Needs approval',
    onHold: 'On hold',
    scheduledFor: 'Scheduled for',
    attempts: 'Attempts',
    created: 'Created',
  },
} as const;

/** Display line for an asset row — API may still send vehicleTitle/stockNumber fields. */
export function formatAssetLead(title: string | null, refId: string | null): string {
  if (title && refId) return `${title} · ${operatorCopy.asset.refLabel}${refId}`;
  if (title) return title;
  if (refId) return `${operatorCopy.asset.refLabel}${refId}`;
  return operatorCopy.asset.unknown;
}
