import { useEffect, useState } from 'react';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchVehicleDetail, type VehicleDetailDto } from '@/lib/api/sdk.ts';
import type { VehiclePerformanceItem, PlatformPerformanceItem } from '@/lib/types.ts';
import { getMediaGuide, type BusinessCategoryId } from '@auto-dealer/category-schemas';
import { VehicleDetailHeader } from './VehicleDetailHeader.tsx';
import { VehicleMetricStrip } from './VehicleMetricStrip.tsx';
import { VehiclePhotoWorkspace } from './VehiclePhotoWorkspace.tsx';
import { VehicleFieldGroups } from './VehicleFieldGroups.tsx';
import { VehicleReadinessChecklist } from './VehicleReadinessChecklist.tsx';
import { VehicleChannelMatrix } from './VehicleChannelMatrix.tsx';
import { MarketplacePublishPanel } from './MarketplacePublishPanel.tsx';
import { VehicleDangerZone } from './VehicleDangerZone.tsx';
import { AssetLifecycleHistory } from './AssetLifecycleHistory.tsx';

type Props = {
  dealerId: string;
  vehicleId: string;
  perf?: VehiclePerformanceItem | null;
  platformPerfBySlug?: Map<string, PlatformPerformanceItem>;
  benchmarksUpdating?: boolean;
  onClose: () => void;
  onMediaAssigned?: () => void;
};

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-[10px] font-bold text-ink-faint uppercase tracking-widest pb-2 border-b border-silver-100">
      {title}
    </h2>
  );
}

type WizardTabKey = 'photos' | 'details' | 'channels';
type SectionStatus = 'complete' | 'needs_attention' | 'incomplete';

const sectionStatusMeta: Record<SectionStatus, { label: string; badge: string; dot: string }> = {
  complete: {
    label: 'Done',
    badge: 'bg-green-100 text-green-700 border-green-200',
    dot: 'bg-green-500',
  },
  needs_attention: {
    label: 'Needs attention',
    badge: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  incomplete: {
    label: 'Incomplete',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
};

function photoStatus(vehicle: VehicleDetailDto): SectionStatus {
  const requiredMissing = vehicle.readiness.missingRequiredMediaSlots.length;
  if (requiredMissing > 0) return 'needs_attention';
  return vehicle.readiness.missingRecommendedMediaSlots.length > 0 ? 'incomplete' : 'complete';
}

function detailsStatus(vehicle: VehicleDetailDto): SectionStatus {
  const fieldIssues = vehicle.readiness.missingFields.length + vehicle.readiness.invalidFields.length;
  if (fieldIssues > 0) return 'needs_attention';
  return vehicle.readiness.warnings.length > 0 ? 'incomplete' : 'complete';
}

function channelDistributionStatus(vehicle: VehicleDetailDto): SectionStatus {
  if (vehicle.distribution.failedCount > 0 || vehicle.distribution.blockedCount > 0) return 'needs_attention';
  return vehicle.distribution.nextAction ? 'incomplete' : 'complete';
}

function photoProgressLabel(vehicle: VehicleDetailDto): string {
  const guide = getMediaGuide(vehicle.category as BusinessCategoryId);
  if (!guide) return `${vehicle.media.length} uploaded`;
  const assignedSlots = new Set(vehicle.media.map(m => m.mediaSlotKey).filter(Boolean));
  const completedRequired = guide.minimumPublishSet.filter(slotKey => assignedSlots.has(slotKey)).length;
  return `${completedRequired}/${guide.minimumPublishSet.length} required`;
}

export function InventoryDetailPanel({
  dealerId,
  vehicleId,
  perf,
  onClose,
  onMediaAssigned,
}: Props) {
  const { data: vehicle, loading, error, reload } = useAsyncQuery(
    () => fetchVehicleDetail(dealerId, vehicleId),
    [dealerId, vehicleId],
  );
  // Bumped on every reload so dependent sections (channel matrix) refetch too.
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeWizardTab, setActiveWizardTab] = useState<WizardTabKey>('photos');
  const [channelStatus, setChannelStatus] = useState<SectionStatus | null>(null);

  useEffect(() => {
    setActiveWizardTab('photos');
    setChannelStatus(null);
  }, [vehicleId]);

  if (loading && !vehicle) {
    return (
      <div className="flex items-center justify-center h-48 text-xs text-ink-muted">
        Loading vehicle…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-xs text-red-600">
        {error}
      </div>
    );
  }

  if (!vehicle) return null;

  const handleReload = () => {
    reload();
    setRefreshKey(k => k + 1);
    onMediaAssigned?.();
  };

  const fieldIssueCount = vehicle.readiness.missingFields.length + vehicle.readiness.invalidFields.length;
  const wizardTabs = [
    {
      key: 'photos' as const,
      label: 'Photos',
      status: photoStatus(vehicle),
      detail: photoProgressLabel(vehicle),
    },
    {
      key: 'details' as const,
      label: 'Vehicle details',
      status: detailsStatus(vehicle),
      detail: fieldIssueCount > 0
        ? `${fieldIssueCount} field issue${fieldIssueCount === 1 ? '' : 's'}`
        : 'Required fields set',
    },
    {
      key: 'channels' as const,
      label: 'Channels',
      status: channelStatus ?? channelDistributionStatus(vehicle),
      detail: vehicle.distribution.nextAction ?? `${vehicle.distribution.liveCount} live`,
    },
  ];

  const activeIndex = wizardTabs.findIndex(tab => tab.key === activeWizardTab);
  const previousTab = activeIndex > 0 ? wizardTabs[activeIndex - 1] : null;
  const nextTab = activeIndex < wizardTabs.length - 1 ? wizardTabs[activeIndex + 1] : null;
  const activeTab = wizardTabs[activeIndex] ?? wizardTabs[0];

  return (
    <div className="flex flex-col h-full bg-silver-50 w-full">
      {/* Sticky header — stays at top while scrolling */}
      <VehicleDetailHeader
        vehicle={vehicle}
        onClose={onClose}
        onReload={handleReload}
      />

      {/* Compact metric strip — immediately below header */}
      <VehicleMetricStrip vehicle={vehicle} perf={perf} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 mx-auto w-full pb-24">

          {/* ── Readiness ─────────────────────────────────────────────────── */}
          <section className="bg-white px-6 pb-4">
            <div className="mt-4">
              <VehicleReadinessChecklist readiness={vehicle.readiness} />
            </div>
          </section>

          <div className="px-6">
            <div className="rounded-xl border border-silver-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-silver-100 bg-silver-50 px-4 py-3">
                <div className="grid gap-2 md:grid-cols-3">
                  {wizardTabs.map((tab, index) => {
                    const meta = sectionStatusMeta[tab.status];
                    const isActive = tab.key === activeWizardTab;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveWizardTab(tab.key)}
                        className={`min-h-[72px] rounded-lg border px-3 py-2 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 ${
                          isActive
                            ? 'border-navy-100 bg-blue-50 shadow-sm'
                            : 'border-transparent bg-transparent hover:bg-white/70 hover:border-silver-200'
                        }`}
                        aria-current={isActive ? 'step' : undefined}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                            Step {index + 1}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-bold text-ink-heading">{tab.label}</p>
                        <p className="mt-0.5 text-[11px] text-ink-muted truncate">{tab.detail}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-6">
                {activeWizardTab === 'photos' && (
                  <section>
                    <SectionHeader title="Photos" />
                    <div className="mt-4">
                      <VehiclePhotoWorkspace
                        dealerId={dealerId}
                        vehicleId={vehicleId}
                        category={vehicle.category as BusinessCategoryId}
                        media={vehicle.media}
                        onAssigned={handleReload}
                      />
                    </div>
                  </section>
                )}

                {activeWizardTab === 'details' && (
                  <section className="space-y-6">
                    <div>
                      <SectionHeader title="Vehicle Details" />
                      <div className="mt-4">
                        <VehicleFieldGroups vehicle={vehicle} onSaved={handleReload} />
                      </div>
                    </div>

                    <div>
                      <SectionHeader title="History" />
                      <div className="mt-4">
                        <AssetLifecycleHistory dealerId={dealerId} stockNumber={vehicle.stockNumber} />
                      </div>
                    </div>

                    {vehicle.options.length > 0 && (
                      <div>
                        <SectionHeader title="Options / Packages" />
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {vehicle.options.map(opt => (
                            <span key={opt} className="text-[11px] px-2 py-0.5 bg-silver-100 border border-silver-200 rounded-md text-ink-body">
                              {opt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <VehicleDangerZone vehicle={vehicle} onReload={handleReload} />
                  </section>
                )}

                {activeWizardTab === 'channels' && (
                  <section>
                    <SectionHeader title="Channels" />
                    <div className="mt-4 space-y-4">
                      <div className="rounded-lg border border-navy-100 bg-navy-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-navy-800">Dealer Storefront publish</p>
                            <p className="mt-1 text-[11px] leading-5 text-ink-muted">
                              Ready makes this vehicle eligible. Selected keeps the storefront allowed. Publish is the final on/off switch that creates the live owned-marketplace listing.
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <MarketplacePublishPanel dealerId={dealerId} vehicleId={vehicleId} />
                        </div>
                      </div>
                      <VehicleChannelMatrix
                        dealerId={dealerId}
                        vehicleId={vehicleId}
                        refreshKey={refreshKey}
                        onStatusChange={setChannelStatus}
                      />
                    </div>
                  </section>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-silver-100 bg-silver-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  disabled={!previousTab}
                  onClick={() => previousTab && setActiveWizardTab(previousTab.key)}
                  className="rounded-md border border-silver-200 bg-white px-3 py-2 text-xs font-bold text-ink-body transition-colors hover:border-silver-300 hover:text-ink-heading disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {previousTab ? `Previous: ${previousTab.label}` : 'Previous'}
                </button>
                <div className="text-center text-[11px] font-semibold text-ink-muted">
                  {activeTab.label} | {sectionStatusMeta[activeTab.status].label}
                </div>
                <button
                  type="button"
                  disabled={!nextTab}
                  onClick={() => nextTab && setActiveWizardTab(nextTab.key)}
                  className="btn-primary-operator px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {nextTab ? `Next: ${nextTab.label}` : 'Complete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
