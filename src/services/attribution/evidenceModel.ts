// 4-Tier Evidence Hierarchy Model for StarterGrid
// Categorizes metrics by empirical origin to ensure commercial credibility and prevent fabricated metrics.

export type EvidenceTier = 'OBSERVED' | 'DEALER_REPORTED' | 'ATTRIBUTED' | 'ESTIMATED';

export interface EvidenceTierMeta {
  tier: EvidenceTier;
  badgeLabel: string;
  confidenceScore: number;
  description: string;
}

const EVIDENCE_TIER_META: Record<EvidenceTier, EvidenceTierMeta> = {
  OBSERVED: {
    tier: 'OBSERVED',
    badgeLabel: 'Observed',
    confidenceScore: 4,
    description: 'Direct platform telemetry measured by StarterGrid infrastructure (e.g. verified live listing, API response).',
  },
  DEALER_REPORTED: {
    tier: 'DEALER_REPORTED',
    badgeLabel: 'Dealer Reported',
    confidenceScore: 3,
    description: 'Operational figures entered or confirmed directly by dealership personnel (e.g. channel monthly invoice).',
  },
  ATTRIBUTED: {
    tier: 'ATTRIBUTED',
    badgeLabel: 'Attributed',
    confidenceScore: 2,
    description: 'Deterministic connection linking a confirmed sale to prior buyer inquiries for that specific vehicle.',
  },
  ESTIMATED: {
    tier: 'ESTIMATED',
    badgeLabel: 'Estimated',
    confidenceScore: 1,
    description: 'Statistical estimation or third-party projection when primary evidence is unavailable.',
  },
};

const KNOWN_TIERS = new Set<string>(['OBSERVED', 'DEALER_REPORTED', 'ATTRIBUTED', 'ESTIMATED']);

export function isEvidenceTier(tier: unknown): tier is EvidenceTier {
  return typeof tier === 'string' && KNOWN_TIERS.has(tier);
}

export function resolveEvidenceTierMeta(tier: unknown): EvidenceTierMeta {
  if (isEvidenceTier(tier)) {
    return EVIDENCE_TIER_META[tier];
  }
  return EVIDENCE_TIER_META.ESTIMATED;
}
