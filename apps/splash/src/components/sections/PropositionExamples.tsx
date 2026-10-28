import React from 'react';
import type { ValueProposition } from '../../data/topTenValueProps.ts';

interface ExampleProps {
  propData: ValueProposition;
}

export const PropositionExample: React.FC<ExampleProps> = ({ propData }) => {
  switch (propData.exampleType) {
    // 01: 70+ Websites & Channel Comparison
    case 'multi-channel':
      return (
        <div style={{ background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ background: '#0d131f', padding: '12px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              <strong style={{ fontSize: '0.8125rem', color: '#ffffff' }}>Active Distribution Network</strong>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontFamily: 'monospace' }}>70+ Channels Available</span>
          </div>
          <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { channel: 'Google Vehicle Ads', status: 'Live & Active', units: '142 units', avgDays: '14 days to sell', color: '#38bdf8' },
              { channel: 'Meta Automotive (FB/IG)', status: 'Live & Active', units: '148 units', avgDays: '18 days to sell', color: '#60a5fa' },
              { channel: 'DealerGrid Marketplace', status: 'First-Party Live', units: '148 units', avgDays: '12 days to sell', color: '#34d399' },
              { channel: 'CarGurus Feed', status: 'Scheduled Batch', units: '140 units', avgDays: '21 days to sell', color: '#fbbf24' },
              { channel: 'AutoTrader / KBB', status: 'Dealer Export', units: '138 units', avgDays: '24 days to sell', color: '#a78bfa' },
            ].map((row, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.04)', fontSize: '0.75rem' }}>
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 600 }}>{row.channel}</div>
                  <div style={{ color: row.color, fontSize: '0.6875rem' }}>● {row.status}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#cbd5e1', fontWeight: 600 }}>{row.units}</div>
                  <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>Avg {row.avgDays}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    // 02: DealerGrid Marketplace Showcase
    case 'marketplace':
      return (
        <div style={{ background: '#090d16', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ background: '#0d131f', padding: '12px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Marketplace Verified VDP
            </span>
            <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600 }}>
              Zero Conquest Ads
            </span>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ width: '110px', height: '74px', borderRadius: '6px', background: '#141a29', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <img
                  src="https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=300&auto=format&fit=crop&q=80"
                  alt="2022 Ford F-150 Lariat"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', marginBottom: '2px' }}>
                  2022 Ford F-150 Lariat 4x4
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px' }}>
                  STK-22084 • 34,120 mi • Austin Auto Group
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#10b981' }}>
                  $46,990
                </div>
              </div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(255, 255, 255, 0.12)', borderRadius: '6px', padding: '12px', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '16px' }}>
              <strong style={{ color: '#ffffff', display: 'block', marginBottom: '2px' }}>🛡️ Dealer Protection Guarantee</strong>
              Shoppers viewing this vehicle see ONLY your dealership details, price, and inquiry form. No rival dealership conquest ads or trade-in traps.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1, padding: '8px', textAlign: 'center', borderRadius: '6px', background: '#2563eb', color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>
                Direct Inquiry Form
              </div>
              <div style={{ flex: 1, padding: '8px', textAlign: 'center', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.06)', color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 600 }}>
                Call Sales Desk
              </div>
            </div>
          </div>
        </div>
      );

    // 03: Paid Social & Search Advertising
    case 'advertising':
      return (
        <div style={{ background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ background: '#0d131f', padding: '12px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.8125rem', color: '#ffffff' }}>Paid Advertising Performance</strong>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Real Monthly Comparison</span>
          </div>
          <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
              <div style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Monthly Ad Spend</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>$1,620</div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Buyer Inquiries</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8' }}>104 Leads</div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Confirmed Sales</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#34d399' }}>14 Units</div>
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px' }}>
                <span>Google Vehicle Ads (Search Intent)</span>
                <strong style={{ color: '#38bdf8' }}>$15.81 Cost / Lead</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px' }}>
                <span>Meta Dynamic Catalog (Facebook/IG)</span>
                <strong style={{ color: '#60a5fa' }}>$15.24 Cost / Lead</strong>
              </div>
            </div>
          </div>
        </div>
      );

    // 04: Automatic Posting & Real-time Monitoring
    case 'autopilot':
      return (
        <div style={{ background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ background: '#0d131f', padding: '12px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.8125rem', color: '#ffffff' }}>Autopilot Schedule & Health Monitor</strong>
            <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600 }}>Status: Online</span>
          </div>
          <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.75rem' }}>
            <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#fff', fontWeight: 600 }}>Automatic Lot Sync: Daily at 06:00 AM</span>
                <span style={{ color: '#34d399' }}>✓ Completed Today</span>
              </div>
              <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>148 active vehicles ingested from DMS, 142 valid for Google, 148 for Marketplace.</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#fff', fontWeight: 600 }}>Pre-Flight Sentry: Photo & Spec Verification</span>
                <span style={{ color: '#38bdf8' }}>100% Passed</span>
              </div>
              <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>0 vehicles dropped due to missing trim codes, mileage, or broken photo links.</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span style={{ color: '#fbbf24', fontWeight: 600 }}>Unlisting Sentry: 2 Units Marked Sold</span>
                <span style={{ color: '#fbbf24' }}>Withdrawn</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.6875rem' }}>STK-22019 and STK-22041 unlisted from all channels immediately to preserve ad spend.</div>
            </div>
          </div>
        </div>
      );

    // 05: DMS Central Connection
    case 'dms-connect':
      return (
        <div style={{ background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ background: '#0d131f', padding: '12px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.8125rem', color: '#ffffff' }}>DMS Coexistence Architecture</strong>
            <span style={{ fontSize: '0.75rem', color: '#a78bfa' }}>Zero Disruption Flow</span>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div>
                <strong style={{ color: '#fff', fontSize: '0.8125rem' }}>Your Operational DMS</strong>
                <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>CDK • Reynolds • Dealertrack • Tekion • Frazer</div>
              </div>
              <span style={{ color: '#60a5fa', fontWeight: 600 }}>System of Record (Accounting & Deals)</span>
            </div>
            <div style={{ textAlign: 'center', color: '#3b82f6', fontSize: '1rem' }}>↓ Daily Automated Ingestion & Normalization ↓</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
              <div>
                <strong style={{ color: '#38bdf8', fontSize: '0.8125rem' }}>DealerGrid Central Hub</strong>
                <div style={{ color: '#cbd5e1', fontSize: '0.6875rem' }}>Standardized VIN, media, prices, options</div>
              </div>
              <span style={{ color: '#10b981', fontWeight: 600 }}>Multi-Channel Engine</span>
            </div>
          </div>
        </div>
      );

    // 06: Team of Real Experts
    case 'expert-team':
      return (
        <div style={{ background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ background: '#0d131f', padding: '12px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.8125rem', color: '#ffffff' }}>Dedicated Automotive Support</strong>
            <span style={{ fontSize: '0.75rem', color: '#10b981' }}>1 Business Day SLA</span>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.125rem' }}>
                MR
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.875rem' }}>Marcus Reed</div>
                <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>Assigned Automotive Onboarding & Channel Specialist</div>
              </div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)', color: '#cbd5e1', lineHeight: 1.5 }}>
              "We review your DMS export format, verify image aspect ratios for Google & Facebook, and ensure leads route properly to your CRM before you go live."
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.6875rem' }}>
              <span>✓ Assisted DMS Export Setup</span>
              <span>✓ Feed Error Resolution</span>
              <span>✓ Direct Support Line</span>
            </div>
          </div>
        </div>
      );

    // 07: Unified Buyer Inquiries & CRM
    case 'leads-crm':
      return (
        <div style={{ background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ background: '#0d131f', padding: '12px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.8125rem', color: '#ffffff' }}>Unified Inquiries Inbox</strong>
            <span style={{ fontSize: '0.6875rem', color: '#34d399', fontWeight: 600 }}>ADF/XML CRM Dispatch: Active</span>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
            {[
              { buyer: 'Marcus Vance', vehicle: '2022 Ford F-150', source: 'Marketplace', rep: 'Jake Miller (Sales)', time: '12m ago', status: 'Routed to Elead' },
              { buyer: 'Sarah Jenkins', vehicle: '2023 Toyota RAV4', source: 'Google Ads', rep: 'Dana Taylor (BDC)', time: '45m ago', status: 'Routed to VinSolutions' },
              { buyer: 'Carlos Mendez', vehicle: '2021 BMW 330i', source: 'CarGurus', rep: 'Jake Miller (Sales)', time: '2h ago', status: 'Contacted' },
            ].map((lead, idx) => (
              <div key={idx} style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 600 }}>{lead.buyer} <span style={{ color: '#64748b', fontWeight: 400 }}>• {lead.vehicle}</span></div>
                  <div style={{ color: '#38bdf8', fontSize: '0.6875rem' }}>Source: {lead.source} • Rep: {lead.rep}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#34d399', fontWeight: 600, fontSize: '0.6875rem' }}>{lead.status}</div>
                  <div style={{ color: '#64748b', fontSize: '0.625rem' }}>{lead.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    // 08: Lot Inventory Management Hub
    case 'inventory-hub':
      return (
        <div style={{ background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ background: '#0d131f', padding: '12px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.8125rem', color: '#ffffff' }}>Centralized Lot Inventory Manager</strong>
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>148 Active Vehicles</span>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
            {[
              { stk: 'STK-22084', title: '2022 Ford F-150 Lariat', price: '$46,990', photos: '22 photos', days: '14d on lot', status: 'Published (5 ch)' },
              { stk: 'STK-23119', title: '2023 Toyota RAV4 XLE', price: '$29,850', photos: '18 photos', days: '9d on lot', status: 'Published (5 ch)' },
              { stk: 'STK-21045', title: '2021 BMW 330i xDrive', price: '$31,500', photos: '24 photos', days: '28d on lot', status: 'Published (4 ch)' },
            ].map((v, idx) => (
              <div key={idx} style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 600 }}>{v.title}</div>
                  <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>{v.stk} • {v.photos} • {v.days}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#10b981', fontWeight: 700 }}>{v.price}</div>
                  <div style={{ color: '#38bdf8', fontSize: '0.6875rem' }}>{v.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    // 09: Dealership Team Roles & Permissions
    case 'team-access':
      return (
        <div style={{ background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ background: '#0d131f', padding: '12px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.8125rem', color: '#ffffff' }}>Team Roles & Collaboration Matrix</strong>
            <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>Role-Based Access</span>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
            {[
              { role: 'General Manager', permissions: 'Full store access, pricing approval, audit logs', count: '1 user' },
              { role: 'Inventory Director', permissions: 'Photo manager, DMS sync settings, channel distribution', count: '2 users' },
              { role: 'Sales Representatives', permissions: 'Assigned customer leads, vehicle notes, showroom holds', count: '8 users' },
              { role: 'BDC Coordinator', permissions: 'Lead dispatch, CRM handoff, response time tracking', count: '3 users' },
            ].map((r, idx) => (
              <div key={idx} style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 600 }}>{r.role}</div>
                  <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>{r.permissions}</div>
                </div>
                <span style={{ color: '#cbd5e1', fontWeight: 600, fontSize: '0.6875rem', background: 'rgba(255, 255, 255, 0.04)', padding: '2px 8px', borderRadius: '4px' }}>
                  {r.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      );

    // 10: Market Demand & Turn Velocity
    case 'market-demand':
      return (
        <div style={{ background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ background: '#0d131f', padding: '12px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.8125rem', color: '#ffffff' }}>Inventory Aging & Market Turn</strong>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>Sample Gated (N ≥ 5)</span>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
            {[
              { segment: 'Compact & Midsize SUVs', count: '54 units', avgDays: '13 days on lot', demand: 'High Demand', demandColor: '#34d399' },
              { segment: 'Half-Ton & Crew Pickups', count: '42 units', avgDays: '16 days on lot', demand: 'Steady Turn', demandColor: '#38bdf8' },
              { segment: 'Full-Size Sedans', count: '28 units', avgDays: '34 days on lot', demand: 'Price Review Suggested', demandColor: '#fbbf24' },
              { segment: 'Luxury & Specialty Sport', count: '14 units', avgDays: '41 days on lot', demand: 'Slow Turn / Re-merchandise', demandColor: '#f87171' },
            ].map((item, idx) => (
              <div key={idx} style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 600 }}>{item.segment}</div>
                  <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>{item.count} • {item.avgDays}</div>
                </div>
                <span style={{ color: item.demandColor, fontWeight: 600, fontSize: '0.6875rem' }}>
                  {item.demand}
                </span>
              </div>
            ))}
          </div>
        </div>
      );

    // 11: Managed Staff Services
    case 'managed-services':
      return (
        <div style={{ background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ background: '#0d131f', padding: '12px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.8125rem', color: '#ffffff' }}>Managed Online Inventory Queue</strong>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>● Fully Managed</span>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
            <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Vehicles Processed & Pushed Today</span>
              <span style={{ color: '#38bdf8', fontWeight: 700 }}>48 Units</span>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Photo & Watermark Quality Check</span>
              <span style={{ color: '#10b981', fontWeight: 700 }}>100% Passed</span>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#bfdbfe', fontWeight: 600 }}>Dealership Labor Required</span>
              <span style={{ color: '#38bdf8', fontWeight: 800 }}>0 Minutes</span>
            </div>
          </div>
        </div>
      );

    // 12: Automotive Industry Veterans
    case 'industry-veterans':
      return (
        <div style={{ background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ background: '#0d131f', padding: '12px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.8125rem', color: '#ffffff' }}>Dedicated Automotive Advisory</strong>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>Direct Access</span>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
            <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', color: '#ffffff', fontWeight: 800 }}>GM</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#ffffff', fontWeight: 600 }}>Former Used Car Director & GM</div>
                <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>Available for monthly turn velocity reviews</div>
              </div>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#065f46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', color: '#ffffff', fontWeight: 800 }}>BDC</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#ffffff', fontWeight: 600 }}>Digital Merchandising Specialist</div>
                <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>Multi-channel posting & ad campaign management</div>
              </div>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};
