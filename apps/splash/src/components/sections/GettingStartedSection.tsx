import React, { useState } from 'react';
import { submitDealershipIntake, type IntakeReceipt } from '../../lib/dealershipIntakeService.ts';
import { getOperatorPortalUrl } from '../../lib/navigation.ts';

export const GettingStartedSection: React.FC = () => {
  const [dealershipName, setDealershipName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentDms, setCurrentDms] = useState('CDK Global');
  const [lotSize, setLotSize] = useState('50 - 150 vehicles');
  const [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState<IntakeReceipt | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const result = submitDealershipIntake({
      dealershipName,
      contactName,
      email,
      phone,
      primaryDms: currentDms,
      lotSize,
      notes: message,
    });

    if (result.ok && result.receipt) {
      setReceipt(result.receipt);
    } else {
      setErrorMsg(result.error || 'Failed to submit request');
    }
  };

  const handleReset = () => {
    setReceipt(null);
    setErrorMsg(null);
  };

  return (
    <section
      id="getting-started"
      style={{
        padding: '96px 24px',
        background: '#06090f',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ maxWidth: '820px', marginBottom: '48px' }}>
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
            GETTING STARTED
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
            How Dealerships Onboard to StarterGrid
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.0625rem', lineHeight: 1.6 }}>
            Getting started is straightforward and does not require replacing your DMS or retraining your sales team on back-office accounting. Here is how dealerships evaluate and deploy StarterGrid:
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '40px',
            alignItems: 'start',
          }}
        >
          {/* Left Column: 4-Step Onboarding Walkthrough */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div
              style={{
                background: '#0d131f',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>
                  STEP 1
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Connect Your Inventory Export
                </h3>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.8125rem', lineHeight: 1.6, margin: 0 }}>
                Set up a regular CSV or XML export from your current DMS (CDK, Reynolds, Dealertrack, Frazer, DealerCenter) or import files manually. Your DMS remains authoritative for deals and flooring.
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>
                  STEP 2
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Select Channels & Review Readiness
                </h3>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.8125rem', lineHeight: 1.6, margin: 0 }}>
                Choose which destinations you want to activate across marketplaces, Google Vehicle Ads, and social catalogs. Review pre-flight readiness checks to fix missing photos or prices before export.
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>
                  STEP 3
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Publish to Marketplace & External Feeds
                </h3>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.8125rem', lineHeight: 1.6, margin: 0 }}>
                Publish compliant vehicles to the StarterGrid Consumer Marketplace and external ad channels with Autopilot automatic updates, while keeping sold stock cleanly unlisted.
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>
                  STEP 4
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Inquiries Route to Your CRM
                </h3>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.8125rem', lineHeight: 1.6, margin: 0 }}>
                Inbound buyer leads transmit into your dealership CRM via industry-standard ADF/XML with mail-server receipt verification, while your team tracks follow-up in the shared inbox.
              </p>
            </div>
          </div>

          {/* Right Column: Request Access / Dealership Evaluation Form */}
          <div
            style={{
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '36px',
            }}
          >
            {receipt ? (
              <div style={{ padding: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
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
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                      {receipt.isDuplicate ? 'Active Request on File' : 'Evaluation Request Received'}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                      REF: {receipt.referenceId}
                    </span>
                  </div>
                </div>

                <p style={{ color: '#cbd5e1', fontSize: '0.8125rem', lineHeight: 1.6, marginBottom: '20px' }}>
                  {receipt.isDuplicate
                    ? `We already have an active evaluation inquiry for ${receipt.dealershipName} on file. Our onboarding team is reviewing your ${receipt.primaryDms} configuration and will follow up shortly.`
                    : `Thank you, ${receipt.contactName}. Your dealership evaluation request has been received. Our onboarding team will follow up within one business day.`}
                </p>

                {/* Structured Operational Receipt */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    fontSize: '0.75rem',
                    marginBottom: '24px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Rooftop Name:</span>
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
                    <span style={{ color: '#64748b' }}>Lot Scope:</span>
                    <span style={{ color: '#cbd5e1' }}>{receipt.lotSize}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Response Time:</span>
                    <span style={{ color: '#34d399', fontWeight: 600 }}>{receipt.reviewSla}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Direct Follow-up:</span>
                    <span style={{ color: '#cbd5e1' }}>{receipt.email}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <a
                    href={getOperatorPortalUrl()}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      background: '#2563eb',
                      color: '#ffffff',
                      textDecoration: 'none',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                    }}
                  >
                    Open Live Demo Portal →
                  </a>
                  <button
                    onClick={handleReset}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '6px',
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#94a3b8',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                    }}
                  >
                    Submit Another Rooftop
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
                    Contact Us
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.8125rem', lineHeight: 1.5, margin: 0 }}>
                    Have questions about DMS compatibility, syndication channels, or custom feeds? Send our team a note, or sign up today in minutes with an email and credit card.
                  </p>
                </div>

                {errorMsg && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      fontSize: '0.75rem',
                      marginBottom: '16px',
                    }}
                  >
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
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
                        padding: '9px 12px',
                        borderRadius: '6px',
                        background: '#090d16',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#ffffff',
                        fontSize: '0.8125rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
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
                          padding: '9px 12px',
                          borderRadius: '6px',
                          background: '#090d16',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#ffffff',
                          fontSize: '0.8125rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Work Phone
                      </label>
                      <input
                        type="tel"
                        placeholder="(512) 555-0199"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '6px',
                          background: '#090d16',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#ffffff',
                          fontSize: '0.8125rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
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
                        padding: '9px 12px',
                        borderRadius: '6px',
                        background: '#090d16',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#ffffff',
                        fontSize: '0.8125rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Primary DMS
                      </label>
                      <select
                        value={currentDms}
                        onChange={(e) => setCurrentDms(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '6px',
                          background: '#090d16',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#ffffff',
                          fontSize: '0.8125rem',
                          outline: 'none',
                        }}
                      >
                        <option value="CDK Global">CDK Global</option>
                        <option value="Reynolds & Reynolds">Reynolds & Reynolds</option>
                        <option value="Dealertrack">Dealertrack</option>
                        <option value="Frazer">Frazer</option>
                        <option value="DealerCenter">DealerCenter</option>
                        <option value="Tekion">Tekion</option>
                        <option value="AutoManager">AutoManager</option>
                        <option value="vAuto / HomeNet">vAuto / HomeNet</option>
                        <option value="Other / CSV Export">Other / CSV Export</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                        Active Lot Size
                      </label>
                      <select
                        value={lotSize}
                        onChange={(e) => setLotSize(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '6px',
                          background: '#090d16',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#ffffff',
                          fontSize: '0.8125rem',
                          outline: 'none',
                        }}
                      >
                        <option value="Under 50 vehicles">Under 50 vehicles</option>
                        <option value="50 - 150 vehicles">50 - 150 vehicles</option>
                        <option value="150 - 300 vehicles">150 - 300 vehicles</option>
                        <option value="300+ vehicles (Multi-rooftop)">300+ vehicles</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                      Evaluation Questions or Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Which advertising channels do you currently use?"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        background: '#090d16',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#ffffff',
                        fontSize: '0.8125rem',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '6px',
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Send Message
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
