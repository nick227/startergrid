import React, { useState } from 'react';
import { submitDealershipIntake, type IntakeReceipt } from '../../lib/dealershipIntakeService.ts';

interface LeadIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
}

export const LeadIntakeModal: React.FC<LeadIntakeModalProps> = ({ isOpen, onClose }) => {
  const [dealershipName, setDealershipName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentDms, setCurrentDms] = useState('CDK Global');
  const [lotSize, setLotSize] = useState('50 - 150 vehicles');
  const [receipt, setReceipt] = useState<IntakeReceipt | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

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
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(7, 19, 33, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#0d1e33',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '540px',
          padding: '32px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(37, 99, 235, 0.15)',
          color: '#fff',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close dialog"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '1.25rem',
            cursor: 'pointer',
            padding: '4px',
            lineHeight: 1,
          }}
        >
          ✕
        </button>

        {receipt ? (
          <div style={{ padding: '12px 0' }}>
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
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  {receipt.isDuplicate ? 'Active Request on File' : 'Evaluation Request Received'}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                  REF: {receipt.referenceId}
                </span>
              </div>
            </div>

            <p style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '20px' }}>
              {receipt.isDuplicate
                ? `An evaluation request for ${receipt.dealershipName} is already assigned in our onboarding queue. Our deployment team is reviewing your ${receipt.primaryDms} export configuration.`
                : `Thank you, ${receipt.contactName}. Your request has been logged and assigned to our automotive ingestion engineering unit.`}
            </p>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.75rem',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Rooftop Name:</span>
                <strong style={{ color: '#ffffff' }}>{receipt.dealershipName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Assigned Queue:</span>
                <span style={{ color: '#38bdf8' }}>{receipt.assignedQueue}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Primary DMS:</span>
                <span style={{ color: '#ffffff' }}>{receipt.primaryDms}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Review SLA:</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>{receipt.reviewSla}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <a
                href="/app/"
                style={{
                  flex: 1,
                  textAlign: 'center',
                  background: '#2563eb',
                  color: '#fff',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                }}
              >
                Open Demo Portal →
              </a>
              <button
                onClick={handleReset}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.8125rem',
                }}
              >
                Reset
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#60a5fa',
                  background: 'rgba(37, 99, 235, 0.15)',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid rgba(37, 99, 235, 0.3)',
                }}
              >
                Dealership Evaluation
              </span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '12px', letterSpacing: '-0.02em' }}>
                Request Dealership Access
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem', marginTop: '6px' }}>
                Speak with our automotive deployment engineering team to review your DMS export compatibility and lot requirements.
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

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.85)' }}>
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
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#071321',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.85)' }}>
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
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#071321',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.85)' }}>
                    Work Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="(512) 555-0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#071321',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.85)' }}>
                  Work Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="gm@austinautogroup.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#071321',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.85)' }}>
                    Current DMS
                  </label>
                  <select
                    value={currentDms}
                    onChange={(e) => setCurrentDms(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#071321',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
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
                    <option value="AutoManager">AutoManager</option>
                    <option value="vAuto / HomeNet">vAuto / HomeNet</option>
                    <option value="Other / CSV Export">Other / CSV Export</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.85)' }}>
                    Active Inventory
                  </label>
                  <select
                    value={lotSize}
                    onChange={(e) => setLotSize(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#071321',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  >
                    <option value="Under 50 vehicles">Under 50 vehicles</option>
                    <option value="50 - 150 vehicles">50 - 150 vehicles</option>
                    <option value="150 - 300 vehicles">150 - 300 vehicles</option>
                    <option value="300+ vehicles (Multi-rooftop)">300+ vehicles (Multi-rooftop)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#2563eb',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                  }}
                >
                  Submit Dealership Information →
                </button>
              </div>

              <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center', margin: 0 }}>
                We respect dealer privacy. Your inventory and customer records are never shared with competitor stores.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
