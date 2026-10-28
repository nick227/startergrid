import React, { useState } from 'react';
import { submitDealershipIntake, type IntakeReceipt } from '../../lib/dealershipIntakeService.ts';

export const ConversionSection: React.FC = () => {
  const [dealershipName, setDealershipName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [primaryDms, setPrimaryDms] = useState('CDK Global');
  const [lotSize, setLotSize] = useState('50 - 150 vehicles');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<IntakeReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = submitDealershipIntake({
      dealershipName,
      contactName,
      email,
      phone,
      primaryDms,
      lotSize,
      notes,
    });

    if (result.ok && result.receipt) {
      setReceipt(result.receipt);
    } else {
      setError(result.error || 'Unable to submit request. Please verify your entries.');
    }
  };

  return (
    <section
      id="getting-started"
      style={{
        padding: '140px 32px',
        background: '#06090f',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        position: 'relative',
        scrollMarginTop: '72px',
      }}
    >
      <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '64px',
            alignItems: 'flex-start',
          }}
        >
          {/* Left Column: Clear Value & Next Steps */}
          <div>
            <div
              style={{
                fontSize: '0.8125rem',
                fontWeight: 800,
                letterSpacing: '0.14em',
                color: '#3b82f6',
                textTransform: 'uppercase',
                marginBottom: '20px',
              }}
            >
              DEALERSHIP ONBOARDING
            </div>

            <h2
              style={{
                fontSize: 'clamp(2.4rem, 4.5vw, 4rem)',
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '-0.035em',
                lineHeight: 1.08,
                marginBottom: '24px',
              }}
            >
              Get your dealership connected to DealerGrid.
            </h2>

            <p
              style={{
                fontSize: 'clamp(1.15rem, 1.8vw, 1.45rem)',
                lineHeight: 1.6,
                color: '#94a3b8',
                marginBottom: '40px',
              }}
            >
              Request an evaluation for your store. Speak with our team to verify your DMS export format and explore live dealership access.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <span
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#60a5fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.875rem',
                    flexShrink: 0,
                  }}
                >
                  1
                </span>
                <div>
                  <strong style={{ color: '#ffffff', fontSize: '1.0625rem', display: 'block', marginBottom: '4px' }}>
                    DMS & Inventory Verification
                  </strong>
                  <p style={{ color: '#94a3b8', fontSize: '0.9375rem', lineHeight: 1.5, margin: 0 }}>
                    We verify your existing inventory output format (CDK, Reynolds, Dealertrack, Tekion, Frazer, or CSV) with zero disruption to store accounting.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <span
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#60a5fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.875rem',
                    flexShrink: 0,
                  }}
                >
                  2
                </span>
                <div>
                  <strong style={{ color: '#ffffff', fontSize: '1.0625rem', display: 'block', marginBottom: '4px' }}>
                    Channel & Marketplace Setup
                  </strong>
                  <p style={{ color: '#94a3b8', fontSize: '0.9375rem', lineHeight: 1.5, margin: 0 }}>
                    We assist in configuring your advertising catalogs, search feeds, and free DealerGrid Marketplace showcase with zero conquest ads.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <span
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#60a5fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.875rem',
                    flexShrink: 0,
                  }}
                >
                  3
                </span>
                <div>
                  <strong style={{ color: '#ffffff', fontSize: '1.0625rem', display: 'block', marginBottom: '4px' }}>
                    CRM Handshake & Lead Delivery
                  </strong>
                  <p style={{ color: '#94a3b8', fontSize: '0.9375rem', lineHeight: 1.5, margin: 0 }}>
                    We test standard ADF 1.0 XML dispatch so buyer inquiries land directly in your sales team’s CRM inbox from day one.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Working Evaluation Request Form */}
          <div
            style={{
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '40px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            {receipt ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: receipt.isDuplicate ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      border: `1px solid ${receipt.isDuplicate ? '#f59e0b' : '#10b981'}`,
                      color: receipt.isDuplicate ? '#fbbf24' : '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                    }}
                  >
                    {receipt.isDuplicate ? 'ℹ' : '✓'}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                      {receipt.isDuplicate ? 'Active Request on File' : 'Evaluation Request Received'}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                      REF: {receipt.referenceId}
                    </span>
                  </div>
                </div>

                <p style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '24px' }}>
                  {receipt.isDuplicate
                    ? `We already have an active evaluation request for ${receipt.dealershipName} on file. Our team is reviewing your ${receipt.primaryDms} configuration and will follow up shortly.`
                    : `Thank you, ${receipt.contactName}. Your dealership evaluation request has been received. Our team will review your lot requirements and follow up within one business day.`}
                </p>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '8px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    fontSize: '0.8125rem',
                    marginBottom: '28px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Dealership Rooftop:</span>
                    <strong style={{ color: '#ffffff' }}>{receipt.dealershipName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Assigned Team:</span>
                    <span style={{ color: '#38bdf8' }}>{receipt.assignedQueue}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Primary DMS:</span>
                    <span style={{ color: '#ffffff' }}>{receipt.primaryDms}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Response Time:</span>
                    <span style={{ color: '#34d399', fontWeight: 600 }}>{receipt.reviewSla}</span>
                  </div>
                </div>

                <button
                  onClick={() => setReceipt(null)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                  }}
                >
                  Submit Another Request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
                    Request Dealership Access
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
                    Speak with our automotive team to verify your DMS export and explore DealerGrid.
                  </p>
                </div>

                {error && (
                  <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.8125rem' }}>
                    {error}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Dealership Rooftop Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Austin Auto Group"
                    value={dealershipName}
                    onChange={(e) => setDealershipName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '6px',
                      background: '#080c14',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="General Manager"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '6px',
                        background: '#080c14',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="gm@dealership.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '6px',
                        background: '#080c14',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Primary DMS
                    </label>
                    <select
                      value={primaryDms}
                      onChange={(e) => setPrimaryDms(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '6px',
                        background: '#080c14',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                    >
                      <option value="CDK Global">CDK Global</option>
                      <option value="Reynolds & Reynolds">Reynolds & Reynolds</option>
                      <option value="Dealertrack">Dealertrack</option>
                      <option value="Frazer">Frazer</option>
                      <option value="DealerCenter">DealerCenter</option>
                      <option value="Tekion">Tekion</option>
                      <option value="Other / CSV Export">Other / CSV Export</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Active Lot Size
                    </label>
                    <select
                      value={lotSize}
                      onChange={(e) => setLotSize(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '6px',
                        background: '#080c14',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                    >
                      <option value="Under 50 vehicles">Under 50 vehicles</option>
                      <option value="50 - 150 vehicles">50 - 150 vehicles</option>
                      <option value="150 - 300 vehicles">150 - 300 vehicles</option>
                      <option value="300+ vehicles">300+ vehicles (Multi-rooftop)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Direct Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. (512) 555-0198"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '6px',
                        background: '#080c14',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Current Distribution Channels or Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Currently posting manually to Facebook and CarGurus. Wanting to automate inventory syndication."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '6px',
                        background: '#080c14',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '8px',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#1d4ed8')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#2563eb')}
                  >
                    Submit Dealership Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
