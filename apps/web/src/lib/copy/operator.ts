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
    noAssignedOrgs: 'No organizations are assigned to your account.',
    changeAction: 'Change organization',
    manualOpen: 'Open',
  },
  auth: {
    signInTitle: 'Operator sign in',
    signInSubtitle: 'Sign in to manage channels, queue, and inventory.',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    signInAction: 'Sign in',
    signingIn: 'Signing in…',
    signOut: 'Sign out',
    invalidCredentials: 'Email or password is incorrect.',
    signInFailed: 'Sign in failed. Check your connection and try again.',
    checkingSession: 'Checking session…',
    orgForbidden: 'You do not have access to this organization.',
  },
  channels: {
    singular: 'channel',
    plural: 'channels',
    all: 'All channels',
    /**
     * Row action labels on OpsRowCard lists (Inventory, Platforms, Queue, History).
     * Routing contract — see docs/ui-status.md § Row actions:
     * - Details  → local drawer on the current page (no navigation)
     * - Queue    → global or platform queue with ?ref= / ?assetId= search prefill
     * - History  → global or platform history with ?ref= / ?assetId= search prefill
     * - Inventory → inventory tab with ?ref= search prefill
     */
    rowActions: {
      details: 'Details',
      queue: 'Queue',
      history: 'History',
      inventory: 'Inventory',
    },
  },
  platforms: {
    title: 'Platforms',
    searchPlaceholder: 'Search channels',
    loading: 'Loading channels…',
    emptyFilter: 'No channels match your filters.',
    noneConfigured: 'No channels configured yet.',
    fixSetup: 'Fix setup',
    openQueue: 'Open queue',
    assetsListed: 'Assets listed',
    observedAssists: 'Observed assists',
    avgExposure: 'Avg exposure',
    signals: 'Signals',
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
      `Review ${refs} — check Days / Signal on each card; listing details may need attention.`,
    blockedCallout: (n: number) =>
      `${n} ${n === 1 ? operatorCopy.asset.singular : operatorCopy.asset.plural} blocked — fix before channels can update.`,
    readyCallout: (n: number) =>
      `${n} ${n === 1 ? operatorCopy.asset.singular : operatorCopy.asset.plural} passed validation and can feed channels.`,
    readyCta: (n: number) => `${n} ready — Queue →`,
    importCompletePlatforms: 'Channels will update automatically.',
    movementBenchmarks: (n: number) =>
      `Movement benchmarks for ${n} ${n === 1 ? operatorCopy.asset.singular : operatorCopy.asset.plural} — open Details on a row for more.`,
    movementWhenSync: 'When auto-sync finishes, expand an asset for movement vs similar listings.',
    filtersSubtitle: 'Lifecycle, readiness, movement signals, and issue types',
    intakeAssetCount: (n: number) =>
      `${n} ${n === 1 ? operatorCopy.asset.singular : operatorCopy.asset.plural}`,
    dryRunRemovalNote: 'Dry-run only — missing assets appear as removal candidates. Scheduled poll never auto-removes.',
  },
  reports: {
    title: 'Reports',
    subtitle: 'What needs action today — plus channel and inventory performance reference.',
    hubActionHeading: 'Action reports',
    hubActionSubtitle: 'Daily decisions — what needs attention now.',
    hubManagementHeading: 'Management reports',
    hubManagementSubtitle: 'Weekly review — trends, volume, and observed outcomes.',
    hubInventoryHealthHeading: 'Inventory Health',
    hubInventoryHealthSubtitle: 'Monitor stale stock and lifecycle changes.',
    hubPublishingHealthHeading: 'Publishing Health',
    hubPublishingHealthSubtitle: 'Ensure vehicles are live and accurately syncing.',
    hubDemandPerformanceHeading: 'Demand & Performance',
    hubDemandPerformanceSubtitle: 'Track leads, channel performance, and time-to-sell.',
    viewFullReport: 'View full report',
    comingSoon: 'Coming in a later release — aggregation API required.',
    backToHub: '← All reports',
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
    searchAssets: 'Search ref, make, model…',
    searchPlatforms: 'Search platform slug…',
    searchReadiness: 'Search ref #, issue…',
    searchChannels: 'Search channel slug…',
    observedDemandDisclaimer: 'Observed demand counts leads and inquiry-style channel events — not sales attribution.',
    throughputSummary: (sent: number, failed: number, open: number) =>
      `${sent} sent · ${failed} failed · ${open} open queue`,
    syncSummaryLine: (total: number) => `${total} sync events in period`,
    demandSummaryLine: (withDemand: number, highAgeZero: number) =>
      `${withDemand} assets with demand · ${highAgeZero} high-age with none`,
    lifecycleSummaryLine: (intake: number, sold: number, removed: number, net: number) =>
      `${intake} intake · ${sold} sold · ${removed} removed · net ${net >= 0 ? '+' : ''}${net}`,
    merchandisingSummaryLine: (active: number, neglected: number, total: number) =>
      `${active} assets worked · ${neglected} active neglected · ${total} updates`,
    velocitySummaryLine: (cohort: number, channels: number) =>
      `${cohort} outcomes · ${channels} channels with observed time-to-outcome`,
    velocityDisclaimer: 'Observed time-to-outcome is not sales attribution.',
    rangeNow: 'As of now',
    range7d: 'Last 7 days',
    range30d: 'Last 30 days',
    range90d: 'Last 90 days',
    snapshotOnlyHint: 'Point-in-time report — range locked to as of now.',
    catalog: {
      movement: {
        title: 'Stale Inventory',
        decision: 'Vehicles sitting longer than average. Needs pricing or photo updates.',
        primaryMetric: 'Stale + slow',
      },
      readiness: {
        title: 'Publish Blockers',
        decision: 'Vehicles failing to list on channels due to missing data or validation errors.',
        primaryMetric: 'Blocked assets',
      },
      throughput: {
        title: 'Channel Failures',
        decision: 'Sync errors and broken connections to marketplaces.',
        primaryMetric: 'Failed sends',
      },
      demand: {
        title: 'Vehicle Interest',
        decision: 'Which vehicles are getting leads, and which are getting ignored.',
        primaryMetric: 'Zero-lead stale',
      },
      exposure: {
        title: 'Listing Coverage',
        decision: 'Percentage of your inventory successfully live on each connected channel.',
        primaryMetric: 'Lowest coverage',
      },
      engagement: {
        title: 'Top Channels',
        decision: 'Which marketplaces are generating the most engagement for your listings.',
        primaryMetric: 'Top assists',
      },
      syncSummary: {
        title: 'Sync Activity',
        decision: 'Volume of updates sent to channels recently.',
        primaryMetric: 'Events',
      },
      lifecycle: {
        title: 'Inventory Flow',
        decision: 'Vehicles added vs. sold/removed.',
        primaryMetric: 'Net change',
      },
      merchandising: {
        title: 'Inventory Updates',
        decision: 'Active vehicles that haven\'t been updated (price/photos) recently.',
        primaryMetric: 'No changes',
      },
      velocity: {
        title: 'Time to Sell',
        decision: 'Average days a vehicle sits on a channel before selling.',
        primaryMetric: 'Fastest median',
      },
    },
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
    noThroughputChannels: {
      title: 'No publish activity in this range',
      subtitle: 'Queue sends and sync events will appear after inventory is submitted to channels.',
    },
    noSyncActivity: {
      title: 'No sync activity in this range',
      subtitle: 'Operational sync events appear after prepare, queue, and channel runs occur.',
    },
    noObservedDemand: {
      title: 'No observed demand in this range',
      subtitle: 'Leads and inquiry-style channel events will appear as shoppers engage with listings.',
    },
    noLifecycleFlow: {
      title: 'No lifecycle activity in this range',
      subtitle: 'Intake, sold, and removed transitions appear as inventory changes over time.',
    },
    noMerchandisingActivity: {
      title: 'No merchandising updates in this range',
      subtitle: 'Price, photo, and detail changes will appear when assets are actively worked.',
    },
    noChannelVelocity: {
      title: 'No observed outcomes in this range',
      subtitle: 'Time-to-outcome appears after assets sell or are removed with prior channel sends.',
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
