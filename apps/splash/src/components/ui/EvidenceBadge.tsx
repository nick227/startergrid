import React from 'react';
import type { EvidenceTier } from '../../data/attributionBenchmarks.ts';

interface EvidenceBadgeProps {
  tier: EvidenceTier;
  showExplanation?: boolean;
}

const TIER_CONFIG: Record<EvidenceTier, { label: string; bg: string; color: string; border: string; desc: string }> = {
  Observed: {
    label: '[Observed]',
    bg: 'rgba(16, 185, 129, 0.12)',
    color: '#34d399',
    border: 'rgba(16, 185, 129, 0.3)',
    desc: 'Direct platform counts measured on StarterGrid servers (e.g. marketplace page views, lead submissions).',
  },
  Reported: {
    label: '[Reported]',
    bg: 'rgba(245, 158, 11, 0.12)',
    color: '#fbbf24',
    border: 'rgba(245, 158, 11, 0.3)',
    desc: 'Ad spend or figures reported by the dealership or external advertising invoices.',
  },
  Attributed: {
    label: '[Attributed]',
    bg: 'rgba(59, 130, 246, 0.12)',
    color: '#60a5fa',
    border: 'rgba(59, 130, 246, 0.3)',
    desc: 'Verified car sales connected to originating channel leads via sales desk confirmation or qualified inquiry.',
  },
  Estimated: {
    label: '[Estimated]',
    bg: 'rgba(168, 85, 247, 0.12)',
    color: '#c084fc',
    border: 'rgba(168, 85, 247, 0.3)',
    desc: 'Estimate based on available data when sample size is under 5 units, requiring more volume before drawing firm conclusions.',
  },
};

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({ tier, showExplanation = false }) => {
  const config = TIER_CONFIG[tier];

  return (
    <span
      className="evidence-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        fontSize: '0.75rem',
        fontWeight: 600,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        borderRadius: '4px',
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        letterSpacing: '0.02em',
        cursor: 'help',
      }}
      title={config.desc}
    >
      {config.label}
      {showExplanation && (
        <span style={{ marginLeft: '6px', fontSize: '0.6875rem', opacity: 0.8, fontWeight: 400 }}>
          {config.desc}
        </span>
      )}
    </span>
  );
};
