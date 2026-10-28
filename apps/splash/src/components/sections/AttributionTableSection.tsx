import React, { useState } from 'react';
import { ATTRIBUTION_BENCHMARKS, type AttributionRow } from '../../data/attributionBenchmarks.ts';
import { EvidenceBadge } from '../ui/EvidenceBadge.tsx';

export const AttributionTableSection: React.FC = () => {
  const [evidenceFilter, setEvidenceFilter] = useState<'all' | 'Observed' | 'Attributed'>('all');

  const filteredRows = ATTRIBUTION_BENCHMARKS.filter((r) => {
    if (evidenceFilter === 'all') return true;
    return r.evidence === evidenceFilter;
  });

  return (
    <section
      id="attribution"
      style={{
        padding: '96px 24px',
        background: '#071321',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ maxWidth: '820px', marginBottom: '40px' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#a78bfa',
              marginBottom: '10px',
            }}
          >
            CLOSED-LOOP ROI ENGINE
          </div>
          <h2
            style={{
              fontSize: 'clamp(1.8rem, 3.2vw, 2.75rem)',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              marginBottom: '16px',
            }}
          >
            Sales Tracking by Channel & Evidence Standards
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.68)', fontSize: '1.0625rem', lineHeight: 1.6 }}>
            Every ad portal claims credit for your vehicle sales. StarterGrid replaces vendor claims with <strong>verified sales tracking</strong>: when a vehicle is marked sold in your inventory, we connect the sale to recorded buyer inquiries so you see your actual Cost Per Lead (CPL) and Cost Per Sale (CPS).
          </p>
        </div>

        {/* Evidence Filter Tabs */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setEvidenceFilter('all')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid ' + (evidenceFilter === 'all' ? '#2563eb' : 'rgba(255, 255, 255, 0.1)'),
                background: evidenceFilter === 'all' ? '#2563eb' : 'rgba(255, 255, 255, 0.04)',
                color: evidenceFilter === 'all' ? '#fff' : 'rgba(255, 255, 255, 0.7)',
              }}
            >
              All Performance Data ({ATTRIBUTION_BENCHMARKS.length})
            </button>
            <button
              onClick={() => setEvidenceFilter('Observed')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid ' + (evidenceFilter === 'Observed' ? '#10b981' : 'rgba(255, 255, 255, 0.1)'),
                background: evidenceFilter === 'Observed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                color: evidenceFilter === 'Observed' ? '#34d399' : 'rgba(255, 255, 255, 0.7)',
              }}
            >
              Only [Observed] Telemetry
            </button>
            <button
              onClick={() => setEvidenceFilter('Attributed')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid ' + (evidenceFilter === 'Attributed' ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)'),
                background: evidenceFilter === 'Attributed' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                color: evidenceFilter === 'Attributed' ? '#60a5fa' : 'rgba(255, 255, 255, 0.7)',
              }}
            >
              Only [Attributed] Sales Links
            </button>
          </div>

          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.45)' }}>
            apps/web/channels/PerformanceHub.tsx
          </span>
        </div>

        {/* High-Density Performance Table */}
        <div
          style={{
            background: '#0d1e33',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            overflowX: 'auto',
            marginBottom: '32px',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '920px' }}>
            <thead>
              <tr style={{ background: 'rgba(7, 19, 33, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255, 255, 255, 0.5)' }}>
                <th style={{ padding: '14px 18px' }}>Channel / Destination</th>
                <th style={{ padding: '14px 18px' }}>Monthly Spend</th>
                <th style={{ padding: '14px 18px' }}>Buyer Leads</th>
                <th style={{ padding: '14px 18px' }}>Cost Per Lead (CPL)</th>
                <th style={{ padding: '14px 18px' }}>Attributed Sales</th>
                <th style={{ padding: '14px 18px' }}>Cost Per Sale (CPS)</th>
                <th style={{ padding: '14px 18px' }}>Avg Turn Days</th>
                <th style={{ padding: '14px 18px' }}>Realized Gross</th>
                <th style={{ padding: '14px 18px' }}>Evidence Tier</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.8125rem', fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: '#fff' }}>
              {filteredRows.map((row: AttributionRow) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    background: row.tier === 'owned' ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '14px 18px', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {row.tier === 'owned' && <span style={{ color: '#34d399', fontSize: '0.8rem' }}>★</span>}
                      <span>{row.channelName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', color: 'rgba(255, 255, 255, 0.75)' }}>
                    ${(row.monthlyFee + row.adSpend).toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#fff', fontWeight: 700 }}>
                    {row.inboundLeads}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#38bdf8' }}>
                    ${row.cpl.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#fff', fontWeight: 800 }}>
                    {row.attributedSales} sold
                  </td>
                  <td style={{ padding: '14px 18px', color: '#34d399', fontWeight: 700 }}>
                    ${row.cps.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 18px', color: row.turnDays <= 18 ? '#34d399' : '#fbbf24' }}>
                    {row.turnDays} days
                  </td>
                  <td style={{ padding: '14px 18px', color: '#fff' }}>
                    ${row.grossMargin.toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <EvidenceBadge tier={row.evidence} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4-Tier Evidence Hierarchy Architecture Card */}
        <div
          style={{
            background: 'rgba(7, 19, 33, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '28px',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '14px' }}>
            Why We Enforce the 4-Tier Evidence Badge Standard
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
              fontSize: '0.8125rem',
            }}
          >
            <div>
              <div style={{ marginBottom: '6px' }}><EvidenceBadge tier="Observed" /></div>
              <p style={{ color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5, margin: 0 }}>
                Direct counts recorded on StarterGrid servers (e.g. vehicle views, inquiry forms, direct calls).
              </p>
            </div>

            <div>
              <div style={{ marginBottom: '6px' }}><EvidenceBadge tier="Attributed" /></div>
              <p style={{ color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5, margin: 0 }}>
                Verified sales linked to a channel through sales desk confirmation or qualifying lead records.
              </p>
            </div>

            <div>
              <div style={{ marginBottom: '6px' }}><EvidenceBadge tier="Reported" /></div>
              <p style={{ color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5, margin: 0 }}>
                Marketing costs and numbers reported by the dealership or external advertising invoices.
              </p>
            </div>

            <div>
              <div style={{ marginBottom: '6px' }}><EvidenceBadge tier="Estimated" /></div>
              <p style={{ color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5, margin: 0 }}>
                Statistical models gated by confidence thresholds. Sub-sample cohorts (N &lt; 5) are explicitly flagged as unverified estimates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
