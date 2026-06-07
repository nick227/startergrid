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
  inventory: {
    title: 'Inventory',
    subtitle: 'Import assets, fix blockers, then publish to channels.',
    importHistorySubtitle: 'Recent batch imports for this organization',
    importCsv: 'Import CSV',
    importInventory: 'Import inventory',
    skipToQueue: 'Skip to Queue',
    goToQueue: 'Go to Queue',
    readyToSync: 'Ready to publish',
    cleanupRecommended: 'Cleanup recommended',
    showBlocked: 'Show blocked',
    slowerThanPeers: 'Slower than similar assets',
    staleReview: (refs: string) =>
      `Review ${refs} in the Days / Signal column — listing details may need attention.`,
    blockedCallout: (n: number) =>
      `${n} ${n === 1 ? operatorCopy.asset.singular : operatorCopy.asset.plural} blocked — fix before channels can update.`,
    readyCallout: (n: number) =>
      `${n} ${n === 1 ? operatorCopy.asset.singular : operatorCopy.asset.plural} passed validation and can feed channels.`,
    readyCta: (n: number) => `${n} ready — Queue →`,
    importCompletePlatforms: 'Channels will update automatically.',
    movementBenchmarks: (n: number) =>
      `Movement benchmarks for ${n} ${n === 1 ? operatorCopy.asset.singular : operatorCopy.asset.plural} — expand a row for detail.`,
    movementWhenSync: 'When auto-sync finishes, expand an asset for movement vs similar listings.',
    filtersSubtitle: 'Lifecycle, readiness, movement signals, and issue types',
    intakeAssetCount: (n: number) =>
      `${n} ${n === 1 ? operatorCopy.asset.singular : operatorCopy.asset.plural}`,
    dryRunRemovalNote: 'Dry-run only — missing assets appear as removal candidates. Scheduled poll never auto-removes.',
  },
  reports: {
    title: 'Reports',
    subtitle: 'Channel performance and movement signals — reference view, not a separate workflow.',
    refreshBenchmarks: 'Refresh benchmarks',
    refreshing: 'Refreshing…',
    dayToDayNote: 'Day-to-day work lives in Inventory and Platforms.',
    assistsDisclaimer: 'Observed assists are not sales attribution.',
    activeAssets: 'Active assets',
    fastMovers: 'Fast movers',
    staleRisks: 'Stale risks',
    lowData: 'Low data',
    assetsSection: 'Assets',
    assetsSectionSubtitle: 'Same Days / Signal view as Inventory',
    platformsSection: 'Platforms',
    platformsSectionSubtitle: 'Channel activity and observed assists — not sales attribution',
    quickLists: 'Quick lists',
    quickListsSubtitle: 'Top movement highlights',
    none: 'None',
    refColumn: 'Ref',
    assetColumn: 'Asset',
    daysSignal: 'Days / Signal',
    noChannelActivity: 'No channel activity recorded for this platform.',
  },
  emptyStates: {
    noInventory: {
      title: 'No inventory yet',
      subtitle: 'Import a CSV to add assets. Once they pass checks, channels can receive updates.',
    },
    noInventoryFilter: {
      title: 'No assets match this filter',
      subtitle: 'Clear filters or import more inventory.',
    },
    noIntakeSources: {
      title: 'No intake sources yet',
      subtitle: 'Import a CSV above, or add an API feed to pull inventory automatically.',
    },
    noIntakeRuns: {
      title: 'No intake runs yet',
      subtitle: 'Import a CSV to bring in your first batch of assets.',
    },
    noImportHistory: {
      title: 'No import history yet',
      subtitle: 'Your recent CSV imports will appear here.',
    },
    noPerformanceData: {
      title: 'No performance data yet',
      subtitle: 'Refresh movement benchmarks when you want days-online comparisons vs similar listings.',
    },
    noPerformanceVehicles: {
      title: 'No asset movement data',
      subtitle: 'Add active inventory and refresh performance from Reports.',
    },
    noPerformancePlatforms: {
      title: 'No channel impact yet',
      subtitle: 'Channels show observed assists after inventory has been submitted and leads come in.',
    },
    postImportBenchmarksPending: {
      title: 'Movement benchmarks updating',
      subtitle: 'Auto-sync is running after import. Days / Signal will fill in when reconcile finishes.',
    },
    movementLowDataFleet: {
      title: 'Limited movement benchmarks',
      subtitle: 'Most assets need more delisted comparables. Fast / slow signals appear as history builds.',
    },
    marketplacePreviewUnavailable: {
      title: 'Not on marketplace index',
      subtitle: 'Set a price on active inventory before the consumer listing can appear.',
    },
    marketplacePreviewEmpty: {
      title: 'No consumer listing returned',
      subtitle: 'Marketplace index has no card for this asset yet. Publish after the listing is ready.',
    },
    noAccountBlockers: {
      title: 'No account blockers',
      subtitle: 'Every channel account is clear — queue can reach all destinations.',
    },
    noAccounts: {
      title: 'No channel accounts yet',
      subtitle: 'Accounts appear after you prepare inventory for publishing.',
    },
    noAccountMatches: {
      title: 'No matches',
      subtitle: 'Try another filter or search term.',
    },
    noSyncActivity: {
      title: 'No sync activity yet',
      subtitle: 'Once inventory is ready, updates to channels will show up here.',
    },
  },
} as const;

/** Display line for an asset row — API may still send vehicleTitle/stockNumber fields. */
export function formatAssetLead(title: string | null, refId: string | null): string {
  if (title && refId) return `${title} · ${operatorCopy.asset.refLabel}${refId}`;
  if (title) return title;
  if (refId) return `${operatorCopy.asset.refLabel}${refId}`;
  return operatorCopy.asset.unknown;
}
