import type { ReportTimeWindowDto } from './reportRange.js';

export type ReportBaseMeta = {
  dealershipId: string;
  generatedAt: string;
  range: ReportTimeWindowDto;
};

export type PublishThroughputChannelRow = {
  channelSlug: string;
  sentInPeriod: number;
  failedInPeriod: number;
  retryEventsInPeriod: number;
  dispatchFailuresInPeriod: number;
  openQueueCount: number;
};

export type PublishThroughputReport = {
  meta: ReportBaseMeta;
  summary: {
    sentInPeriod: number;
    failedInPeriod: number;
    retryEventsInPeriod: number;
    dispatchFailuresInPeriod: number;
    openQueueCount: number;
    medianHoursToSend: number | null;
  };
  channels: PublishThroughputChannelRow[];
};

export type SyncActivityKindRow = {
  eventKind: string;
  count: number;
};

export type SyncActivityChannelRow = {
  channelSlug: string;
  totalEvents: number;
  byKind: SyncActivityKindRow[];
};

export type SyncActivityReport = {
  meta: ReportBaseMeta;
  summary: {
    totalEvents: number;
  };
  byKind: SyncActivityKindRow[];
  channels: SyncActivityChannelRow[];
};

export type ObservedDemandChannelRow = {
  channelSlug: string;
  observedLeads: number;
  observedChannelEvents: number;
};

export type ObservedDemandAssetRow = {
  assetId: string;
  assetRef: string;
  daysOnline: number | null;
  movementSignal: string | null;
  observedDemandCount: number;
  observedLeads: number;
  observedChannelEvents: number;
  byChannel: ObservedDemandChannelRow[];
};

export type ObservedDemandReport = {
  meta: ReportBaseMeta;
  summary: {
    assetsWithObservedDemand: number;
    totalObservedDemand: number;
    highAgeZeroDemandCount: number;
  };
  assets: ObservedDemandAssetRow[];
};

export type LifecycleTransitionRow = {
  transitionState: string;
  count: number;
};

export type LifecycleFlowReport = {
  meta: ReportBaseMeta;
  summary: {
    intakeCount: number;
    soldExits: number;
    removedExits: number;
    reactivatedCount: number;
    netChange: number;
  };
  transitions: LifecycleTransitionRow[];
};

export type MerchandisingKindRow = {
  updateKind: string;
  count: number;
};

export type MerchandisingAssetRow = {
  assetId: string;
  assetRef: string;
  updateCount: number;
  byKind: MerchandisingKindRow[];
};

export type MerchandisingActivityReport = {
  meta: ReportBaseMeta;
  summary: {
    assetsWithActivity: number;
    totalUpdates: number;
    activeAssetsNeglected: number;
  };
  assets: MerchandisingAssetRow[];
};

export type ChannelVelocityRow = {
  channelSlug: string;
  observedOutcomeCount: number;
  soldOutcomes: number;
  removedOutcomes: number;
  medianDaysToOutcome: number | null;
};

export type ChannelVelocityReport = {
  meta: ReportBaseMeta;
  summary: {
    cohortOutcomeCount: number;
    channelsWithOutcomes: number;
  };
  channels: ChannelVelocityRow[];
};
