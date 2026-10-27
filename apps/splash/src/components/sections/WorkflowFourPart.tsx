import React, { useState } from 'react';
import { WORKFLOW_STEPS, type WorkflowStep } from '../../data/workflowShowcase.ts';

export const WorkflowFourPart: React.FC = () => {
  const [activeStepId, setActiveStepId] = useState<'inventory' | 'channels' | 'leads' | 'performance'>('inventory');

  const activeStep = WORKFLOW_STEPS.find((s) => s.id === activeStepId) || WORKFLOW_STEPS[0];

  const getPillStyle = (variant: 'success' | 'warning' | 'info' | 'neutral') => {
    switch (variant) {
      case 'success':
        return { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'info':
        return { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' };
      case 'neutral':
        return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  return (
    <section
      id="what-it-does"
      style={{
        padding: '96px 24px',
        background: '#090d16',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ maxWidth: '780px', marginBottom: '40px' }}>
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
            HOW THE SOFTWARE WORKS
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
            What StarterGrid Does
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.0625rem', lineHeight: 1.6 }}>
            A four-part operational workflow connecting your physical inventory, destination advertising channels, buyer inquiries, and sales performance in one unified dealership interface.
          </p>
        </div>

        {/* 4-Part Step Switcher */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
            marginBottom: '36px',
          }}
        >
          {WORKFLOW_STEPS.map((step: WorkflowStep) => {
            const isSelected = step.id === activeStepId;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStepId(step.id)}
                style={{
                  padding: '16px 20px',
                  borderRadius: '8px',
                  background: isSelected ? '#141a29' : 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid ' + (isSelected ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)'),
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    fontFamily: 'monospace',
                    color: isSelected ? '#60a5fa' : '#64748b',
                    marginBottom: '4px',
                  }}
                >
                  STEP {step.number}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: isSelected ? '#ffffff' : '#94a3b8' }}>
                  {step.tabLabel.split('.')[1].trim()}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Step Display */}
        <div
          style={{
            background: '#0d131f',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {/* Top Panel: Headline & Summary */}
          <div
            style={{
              padding: '36px 36px 28px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: '#0a0e17',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700 }}>
                PART {activeStep.number}
              </span>
              <span style={{ color: '#64748b' }}>•</span>
              <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 600 }}>
                {activeStep.tabLabel.split('.')[1].trim()} Workspace
              </span>
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '12px', maxWidth: '860px' }}>
              {activeStep.headline}
            </h3>

            <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.6, maxWidth: '860px', margin: 0 }}>
              {activeStep.summary}
            </p>
          </div>

          {/* Bottom Panel: Two Columns (Capabilities & Authentic Screen Mock) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '32px',
              padding: '36px',
            }}
          >
            {/* Left Column: Operational Details */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: '16px' }}>
                Operational Capabilities
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {activeStep.details.map((item, idx) => (
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
                    <span style={{ color: '#3b82f6', fontWeight: 700, marginTop: '1px' }}>✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Column: Actual Screen Viewport */}
            <div
              style={{
                background: '#090d16',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              {/* Window Header */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '10px 16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                }}
              >
                <div style={{ color: '#fff', fontWeight: 600 }}>
                  {activeStep.screenData.title}
                </div>
                <div style={{ color: '#64748b', fontFamily: 'monospace' }}>
                  {activeStep.screenData.routePath}
                </div>
              </div>

              {/* Table Body */}
              <div style={{ padding: '16px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {activeStep.screenData.columns.map((col, ci) => (
                        <th key={ci} style={{ padding: '6px 8px', fontWeight: 600 }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeStep.screenData.sampleRows.map((row, ri) => {
                      const pill = getPillStyle(row.statusVariant);
                      return (
                        <tr key={ri} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '8px', color: '#fff', fontWeight: 600, whiteSpace: 'pre-line', fontFamily: 'monospace' }}>
                            {row.col1}
                          </td>
                          <td style={{ padding: '8px', color: '#cbd5e1', whiteSpace: 'pre-line' }}>
                            {row.col2}
                          </td>
                          <td style={{ padding: '8px', color: '#fff', fontWeight: 700 }}>
                            {row.col3}
                          </td>
                          <td style={{ padding: '8px', color: '#94a3b8' }}>
                            {row.col4}
                          </td>
                          <td style={{ padding: '8px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: pill.bg,
                                color: pill.color,
                                border: `1px solid ${pill.border}`,
                                fontWeight: 600,
                                fontSize: '0.6875rem',
                              }}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Operational Rule Footer */}
              <div
                style={{
                  padding: '10px 16px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  fontStyle: 'italic',
                }}
              >
                Note: {activeStep.screenData.notes}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
