import React from 'react';
import { ATTRIBUTION_BENCHMARKS } from '../../data/attributionBenchmarks.ts';
import { EvidenceBadge } from '../ui/EvidenceBadge.tsx';

export const PerformanceEvidence: React.FC = () => {
  return (
    <section
      id="performance"
      style={{
        padding: '96px 24px',
        background: '#090d16',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ maxWidth: '820px', marginBottom: '40px' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              color: '#3b82f6',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            SALES RESULTS & EVIDENCE
          </div>
          <h2
            style={{
              fontSize: 'clamp(1.8rem, 3.5vw, 2.75rem)',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              marginBottom: '16px',
            }}
          >
            See Which Channels Actually Sell Cars
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.0625rem', lineHeight: 1.6 }}>
            Dealerships want to know which advertising channels actually bring in paying buyers. StarterGrid connects marketing spend, buyer inquiries, and confirmed vehicle sales when real evidence exists—with clear badges showing where every number came from.
          </p>
        </div>

        {/* 4 Core Practical Principles */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '24px',
            }}
          >
            <div style={{ color: '#60a5fa', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>
              1. Marking a Car Sold Stops Ads
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.8125rem', lineHeight: 1.6, margin: 0 }}>
              When a vehicle is marked sold, StarterGrid removes it from connected channels so you don't waste ad budget. It records the sale date and price, but doesn't guess which ad brought in the buyer.
            </p>
          </div>

          <div
            style={{
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '24px',
            }}
          >
            <div style={{ color: '#38bdf8', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>
              2. Your Sales Desk Has Final Word
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.8125rem', lineHeight: 1.6, margin: 0 }}>
              When your sales team records the customer's lead source on the deal, that dealership confirmation is the authority and takes precedence.
            </p>
          </div>

          <div
            style={{
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '24px',
            }}
          >
            <div style={{ color: '#34d399', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>
              3. Only Qualified Inquiries Count
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.8125rem', lineHeight: 1.6, margin: 0 }}>
              If your sales desk didn't log a source, a sale is linked to a channel only if your team moved a lead from that single channel to SOLD before the car was sold. Conflicting inquiries remain strictly Unattributed.
            </p>
          </div>

          <div
            style={{
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '24px',
            }}
          >
            <div style={{ color: '#fbbf24', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>
              4. Badges Show Evidence Level
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.8125rem', lineHeight: 1.6, margin: 0 }}>
              Every number is labeled: [Observed] direct platform counts, [Dealer Reported] your actual ad spend, and [Attributed] verified sales, so you always know where numbers come from.
            </p>
          </div>
        </div>

        {/* Labeled Reference Lot Table */}
        <div
          style={{
            background: '#0d131f',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '32px',
          }}
        >
          {/* Table Header Callout */}
          <div
            style={{
              background: '#0a0e17',
              padding: '14px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              fontSize: '0.8125rem',
            }}
          >
            <div>
              <strong style={{ color: '#ffffff' }}>Illustrative Channel Performance Layout</strong>
              <span style={{ color: '#64748b', marginLeft: '8px' }}>
                (Reference Dealership Demonstration Dataset from Austin Auto Group)
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Shows how evidence badges appear in apps/web
            </span>
          </div>

          <div style={{ overflowX: 'auto', padding: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.6875rem' }}>
                  <th style={{ padding: '10px 14px' }}>Channel / Destination</th>
                  <th style={{ padding: '10px 14px' }}>Recorded Spend</th>
                  <th style={{ padding: '10px 14px' }}>Inbound Inquiries</th>
                  <th style={{ padding: '10px 14px' }}>Attributed Sales</th>
                  <th style={{ padding: '10px 14px' }}>Avg Turn Days</th>
                  <th style={{ padding: '10px 14px' }}>Evidence Classification</th>
                </tr>
              </thead>
              <tbody>
                {ATTRIBUTION_BENCHMARKS.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '12px 14px', color: '#ffffff', fontWeight: 600 }}>
                      {row.channelName}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>
                      ${(row.monthlyFee + row.adSpend).toLocaleString()} / mo
                    </td>
                    <td style={{ padding: '12px 14px', color: '#ffffff', fontWeight: 600 }}>
                      {row.inboundLeads}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#38bdf8', fontWeight: 700 }}>
                      {row.attributedSales} sales
                    </td>
                    <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>
                      {row.turnDays} days
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <EvidenceBadge tier={row.evidence} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Footnote */}
          <div
            style={{
              padding: '12px 24px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '0.75rem',
              color: '#64748b',
            }}
          >
            Actual dealer performance varies based on local market demand, vehicle pricing, inventory mix, and connected channels. StarterGrid provides the tracking software to measure your numbers objectively.
          </div>
        </div>
      </div>
    </section>
  );
};
