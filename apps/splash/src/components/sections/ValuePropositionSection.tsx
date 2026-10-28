import React from 'react';
import type { ValueProposition } from '../../data/topTenValueProps.ts';
import { PropositionExample } from './PropositionExamples.tsx';

interface ValuePropositionSectionProps {
  propData: ValueProposition;
  isEven: boolean;
  nextPropId?: string;
  onRequestAccess: () => void;
}

export const ValuePropositionSection: React.FC<ValuePropositionSectionProps> = ({
  propData,
  isEven,
  nextPropId,
  onRequestAccess,
}) => {
  return (
    <section
      id={propData.id}
      style={{
        padding: '80px 24px',
        background: isEven ? '#06090f' : '#090d16',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        scrollMarginTop: '64px',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '48px',
            alignItems: 'center',
          }}
        >
          {/* Left Column: Consistent Details & Outcomes */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  color: '#38bdf8',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                }}
              >
                PROPOSITION {propData.number}
              </span>
              <span style={{ color: '#64748b' }}>•</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {propData.category}
              </span>
            </div>

            <h2
              style={{
                fontSize: 'clamp(1.75rem, 3vw, 2.35rem)',
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                lineHeight: 1.18,
                marginBottom: '16px',
              }}
            >
              {propData.title}
            </h2>

            <p
              style={{
                fontSize: '1.125rem',
                lineHeight: 1.6,
                color: '#cbd5e1',
                marginBottom: '28px',
              }}
            >
              {propData.summary}
            </p>

            {/* Key Capabilities List */}
            <div style={{ marginBottom: '32px' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#64748b',
                  marginBottom: '14px',
                }}
              >
                Operational Capabilities & Dealership Outcomes
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {propData.keyPoints.map((point, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      fontSize: '0.875rem',
                      color: '#cbd5e1',
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ color: '#3b82f6', fontWeight: 700, marginTop: '1px', flexShrink: 0 }}>✓</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions & Navigation Links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button
                onClick={onRequestAccess}
                style={{
                  padding: '10px 18px',
                  borderRadius: '6px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Request Rooftop Access
              </button>

              <a
                href="#top-propositions"
                style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>↑ Back to Top 10</span>
              </a>

              {nextPropId && (
                <a
                  href={`#${nextPropId}`}
                  style={{
                    fontSize: '0.75rem',
                    color: '#60a5fa',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>Next Selling Point →</span>
                </a>
              )}
            </div>
          </div>

          {/* Right Column: Concrete Example / Real Software Demonstration */}
          <div>
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
                Real Software Demonstration
              </span>
              <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                Live Front-End Data
              </span>
            </div>

            <PropositionExample propData={propData} />
          </div>
        </div>
      </div>
    </section>
  );
};
