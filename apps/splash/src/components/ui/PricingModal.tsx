import React, { useState, useEffect } from 'react';
import { getOperatorPortalUrl } from '../../lib/navigation.ts';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlanId?: string;
}

interface PricingTier {
  id: string;
  name: string;
  badge?: string;
  isPopular?: boolean;
  monthlyPrice: number;
  annualPrice: number;
  lotCapacity: string;
  description: string;
  features: string[];
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter Lot',
    monthlyPrice: 499,
    annualPrice: 399,
    lotCapacity: 'Up to 75 vehicles',
    description: 'Essential multi-channel syndication for independent dealerships and boutique lots.',
    features: [
      '70+ channel vehicle syndication',
      'DealerGrid Marketplace free showcase',
      'Autopilot scheduled daily inventory sync',
      'Pre-flight VIN & photo error sentry',
      'Standard ADF 1.0 XML CRM lead delivery',
      'Standard email & ticketing support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth Rooftop',
    badge: 'MOST POPULAR',
    isPopular: true,
    monthlyPrice: 899,
    annualPrice: 719,
    lotCapacity: 'Up to 250 vehicles',
    description: 'Complete distribution, paid advertising feeds, and DMS coexistence for volume stores.',
    features: [
      'Everything in Starter Lot',
      'Google Vehicle Ads & Meta Automotive feeds',
      'Automated sold vehicle ad withdrawal',
      'Bi-directional DMS inventory sync',
      'Unlimited team seats & role permissions',
      'Instant ADF 1.0 XML CRM routing',
      'Dedicated onboarding deployment specialist',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Group',
    badge: 'MULTI-ROOFTOP',
    monthlyPrice: 1499,
    annualPrice: 1199,
    lotCapacity: '500+ vehicles (multi-store)',
    description: 'Enterprise vehicle orchestration for dealer groups and high-inventory regional networks.',
    features: [
      'Everything in Growth Rooftop',
      'Multi-rooftop consolidated management',
      'Custom DMS API integration & custom mapping',
      'Custom ADF/XML parsing & BDC desk routing',
      'Market turn rate & inventory aging intelligence',
      'Dedicated solutions engineer & phone support',
      'Quarterly inventory performance reviews',
    ],
  },
];

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  defaultPlanId = 'growth',
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<string>(defaultPlanId);
  const [step, setStep] = useState<'tiers' | 'checkout' | 'success'>('tiers');

  // Form Fields
  const [dealershipName, setDealershipName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [primaryDms, setPrimaryDms] = useState('CDK Global');

  // Mock Stripe State
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState('Contacting Stripe Gateway...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success Receipt State
  const [subscriptionReceipt, setSubscriptionReceipt] = useState<{
    customerId: string;
    subscriptionId: string;
    dealershipName: string;
    planName: string;
    amount: string;
    trialEnds: string;
  } | null>(null);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen) return null;

  const currentPlan = PRICING_TIERS.find((p) => p.id === selectedPlanId) || PRICING_TIERS[1];
  const activePrice = billingCycle === 'annual' ? currentPlan.annualPrice : currentPlan.monthlyPrice;

  // Format card number with spaces
  const handleCardNumberChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 16);
    const parts = clean.match(/.{1,4}/g);
    setCardNumber(parts ? parts.join(' ') : clean);
  };

  // Format expiration MM/YY
  const handleExpChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    if (clean.length >= 3) {
      setCardExp(`${clean.slice(0, 2)}/${clean.slice(2)}`);
    } else {
      setCardExp(clean);
    }
  };

  // Detect card brand
  const getCardBrand = () => {
    const raw = cardNumber.replace(/\s/g, '');
    if (raw.startsWith('4')) return { brand: 'Visa', color: '#1a1f71' };
    if (/^5[1-5]/.test(raw) || /^2[2-7]/.test(raw)) return { brand: 'Mastercard', color: '#eb001b' };
    if (/^3[47]/.test(raw)) return { brand: 'Amex', color: '#007bc1' };
    return null;
  };

  const handleStartCheckout = (planId: string) => {
    setSelectedPlanId(planId);
    setStep('checkout');
    setErrorMsg(null);
  };

  const handleMockStripeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!dealershipName.trim() || !contactName.trim() || !email.trim()) {
      setErrorMsg('Please complete all required dealership registration fields.');
      return;
    }

    if (cardNumber.replace(/\s/g, '').length < 15) {
      setErrorMsg('Please enter a valid card number for mock Stripe authorization.');
      return;
    }

    setIsProcessing(true);
    setProcessMessage('Contacting Stripe Gateway...');

    setTimeout(() => {
      setProcessMessage('Creating customer rooftop token...');
    }, 700);

    setTimeout(() => {
      setProcessMessage('Authorizing 14-day evaluation subscription...');
    }, 1400);

    setTimeout(() => {
      setIsProcessing(false);
      const randomSeed = Math.random().toString(36).substring(2, 8).toUpperCase();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);

      setSubscriptionReceipt({
        customerId: `cus_mock_${randomSeed.toLowerCase()}`,
        subscriptionId: `sub_eval_${randomSeed}`,
        dealershipName: dealershipName.trim(),
        planName: currentPlan.name,
        amount: `$${activePrice}/mo`,
        trialEnds: trialEndDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      });
      setStep('success');
    }, 2100);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 8, 15, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div
        style={{
          background: '#0a0f1d',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: step === 'tiers' ? '1140px' : '720px',
          padding: '40px',
          boxShadow: '0 30px 100px rgba(0, 0, 0, 0.8), 0 0 50px rgba(37, 99, 235, 0.2)',
          color: '#ffffff',
          position: 'relative',
          maxHeight: '92vh',
          overflowY: 'auto',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          aria-label="Close dialog"
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            color: '#94a3b8',
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >
          ✕
        </button>

        {/* ================= STEP 1: PRICING TIERS ================= */}
        {step === 'tiers' && (
          <div>
            {/* Modal Header */}
            <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 36px' }}>
              <div
                style={{
                  display: 'inline-block',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  color: '#3b82f6',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                }}
              >
                PROPOSED DEALERSHIP PRICING
              </div>
              <h2
                style={{
                  fontSize: 'clamp(1.8rem, 3.2vw, 2.75rem)',
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  margin: '0 0 14px',
                  lineHeight: 1.15,
                }}
              >
                Predictable platform pricing for every rooftop.
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.5, margin: 0 }}>
                No listing fees, no buyer transaction commissions, and zero markups on inventory syndication. Every plan includes 70+ channel distribution.
              </p>

              {/* Billing Toggle */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '24px',
                  background: '#070b14',
                  padding: '4px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: billingCycle === 'monthly' ? '#2563eb' : 'transparent',
                    color: billingCycle === 'monthly' ? '#ffffff' : '#94a3b8',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: billingCycle === 'annual' ? '#2563eb' : 'transparent',
                    color: billingCycle === 'annual' ? '#ffffff' : '#94a3b8',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>Annual Billing</span>
                  <span
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#34d399',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    Save 20%
                  </span>
                </button>
              </div>
            </div>

            {/* Pricing Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '24px',
                alignItems: 'stretch',
              }}
            >
              {PRICING_TIERS.map((tier) => {
                const price = billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;
                return (
                  <div
                    key={tier.id}
                    style={{
                      background: tier.isPopular ? 'rgba(37, 99, 235, 0.05)' : '#070b14',
                      border: tier.isPopular
                        ? '2px solid #3b82f6'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '16px',
                      padding: '32px 28px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      boxShadow: tier.isPopular
                        ? '0 10px 40px rgba(37, 99, 235, 0.2)'
                        : 'none',
                    }}
                  >
                    {tier.badge && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-12px',
                          left: '28px',
                          background: tier.isPopular ? '#2563eb' : 'rgba(255, 255, 255, 0.15)',
                          color: '#ffffff',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          padding: '4px 10px',
                          borderRadius: '6px',
                        }}
                      >
                        {tier.badge}
                      </div>
                    )}

                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px' }}>
                        {tier.name}
                      </h3>
                      <div style={{ color: '#38bdf8', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '16px' }}>
                        {tier.lotCapacity}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em' }}>
                          ${price}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.875rem' }}>/month</span>
                      </div>

                      <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '24px' }}>
                        {tier.description}
                      </p>

                      <div
                        style={{
                          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                          paddingTop: '20px',
                          marginBottom: '28px',
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
                          Included Capabilities
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {tier.features.map((feat, idx) => (
                            <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.8125rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                              <span style={{ color: '#3b82f6', fontWeight: 800, flexShrink: 0 }}>✓</span>
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartCheckout(tier.id)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        background: tier.isPopular ? '#2563eb' : 'rgba(255, 255, 255, 0.08)',
                        border: tier.isPopular ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#ffffff',
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = tier.isPopular ? '#1d4ed8' : 'rgba(255, 255, 255, 0.14)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = tier.isPopular ? '#2563eb' : 'rgba(255, 255, 255, 0.08)';
                      }}
                    >
                      {tier.isPopular ? 'Start 14-Day Free Evaluation' : `Select ${tier.name}`}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Assurance */}
            <div
              style={{
                marginTop: '32px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '0.8125rem',
                display: 'flex',
                justifyContent: 'center',
                gap: '24px',
                flexWrap: 'wrap',
              }}
            >
              <span>🔒 14-day evaluation with zero upfront charge</span>
              <span>⚡ Non-disruptive DMS coexistence</span>
              <span>✕ Cancel anytime with one click</span>
            </div>
          </div>
        )}

        {/* ================= STEP 2: REGISTRATION + STRIPE INTEGRATION ================= */}
        {step === 'checkout' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <button
                type="button"
                onClick={() => setStep('tiers')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#60a5fa',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ← Back to Plans
              </button>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(99, 91, 255, 0.12)',
                  border: '1px solid rgba(99, 91, 255, 0.3)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  color: '#a5b4fc',
                  fontWeight: 600,
                }}
              >
                <span>💳 Powered by Stripe</span>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                Complete Dealership Registration
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
                Set up your 14-day evaluation for <strong>{currentPlan.name}</strong> (${activePrice}/mo {billingCycle}). You will not be charged today.
              </p>
            </div>

            {errorMsg && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: '0.8125rem',
                  marginBottom: '20px',
                }}
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleMockStripeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Dealership Details */}
              <div
                style={{
                  background: '#070b14',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
                  1. Dealership Rooftop Information
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Dealership Rooftop Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pinecrest Motorcars"
                      value={dealershipName}
                      onChange={(e) => setDealershipName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        background: '#0c1220',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Sarah Jenkins (GM)"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        background: '#0c1220',
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
                      placeholder="sjenkins@dealership.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        background: '#0c1220',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Direct Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="(512) 555-0144"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        background: '#0c1220',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Primary Store DMS
                    </label>
                    <select
                      value={primaryDms}
                      onChange={(e) => setPrimaryDms(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        background: '#0c1220',
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
                </div>
              </div>

              {/* Mock Stripe Payment Card Box */}
              <div
                style={{
                  background: '#070b14',
                  border: '1px solid rgba(99, 91, 255, 0.25)',
                  borderRadius: '12px',
                  padding: '20px',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    2. Payment Details (Stripe Elements)
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>256-bit SSL Encrypted</span>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full name on card"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      background: '#0c1220',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Card Number
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      placeholder="4242 •••• •••• 4242"
                      value={cardNumber}
                      onChange={(e) => handleCardNumberChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        paddingRight: '60px',
                        borderRadius: '6px',
                        background: '#0c1220',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                        outline: 'none',
                      }}
                    />
                    {getCardBrand() && (
                      <span
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          color: '#ffffff',
                          background: getCardBrand()?.color,
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {getCardBrand()?.brand}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Exp Date
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      value={cardExp}
                      onChange={(e) => handleExpChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        background: '#0c1220',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      CVC
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      placeholder="•••"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        background: '#0c1220',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Postal Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="78701"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value.toUpperCase().slice(0, 7))}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        background: '#0c1220',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Order Summary Line */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.875rem',
                }}
              >
                <div>
                  <strong style={{ color: '#ffffff', display: 'block' }}>
                    {currentPlan.name} ({currentPlan.lotCapacity})
                  </strong>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                    14-day free evaluation period starts today
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#34d399' }}>
                    $0.00 Due Today
                  </div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                    Then ${activePrice}/mo {billingCycle === 'annual' ? '(billed annually)' : ''}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  background: isProcessing ? '#1d4ed8' : '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  cursor: isProcessing ? 'wait' : 'pointer',
                  boxShadow: '0 4px 15px rgba(37, 99, 235, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'background 0.15s ease',
                }}
              >
                {isProcessing ? (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTopColor: '#ffffff',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite',
                      }}
                    />
                    <span>{processMessage}</span>
                  </>
                ) : (
                  <span>Start 14-Day Free Evaluation ($0 Today)</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ================= STEP 3: SUCCESSFUL SUBSCRIPTION RECEIPT ================= */}
        {step === 'success' && subscriptionReceipt && (
          <div style={{ textAlign: 'left', padding: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '2px solid #10b981',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  fontWeight: 900,
                }}
              >
                ✓
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', margin: '0 0 4px' }}>
                  Subscription Activated
                </h2>
                <div style={{ color: '#34d399', fontSize: '0.8125rem', fontWeight: 600 }}>
                  14-Day Evaluation Active • $0 Billed Today
                </div>
              </div>
            </div>

            <p style={{ color: '#cbd5e1', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '28px' }}>
              Welcome to DealerGrid, <strong>{contactName || 'General Manager'}</strong>. Your evaluation instance for <strong>{subscriptionReceipt.dealershipName}</strong> is provisioned. An integration engineer has been assigned to help connect your {primaryDms} inventory feed.
            </p>

            {/* Receipt Summary Card */}
            <div
              style={{
                background: '#070b14',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                fontSize: '0.8125rem',
                marginBottom: '28px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px' }}>
                <span style={{ color: '#64748b' }}>Stripe Customer ID:</span>
                <span style={{ color: '#ffffff', fontFamily: 'monospace' }}>{subscriptionReceipt.customerId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px' }}>
                <span style={{ color: '#64748b' }}>Stripe Subscription ID:</span>
                <span style={{ color: '#a5b4fc', fontFamily: 'monospace' }}>{subscriptionReceipt.subscriptionId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px' }}>
                <span style={{ color: '#64748b' }}>Active Rooftop:</span>
                <strong style={{ color: '#ffffff' }}>{subscriptionReceipt.dealershipName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px' }}>
                <span style={{ color: '#64748b' }}>Selected Plan:</span>
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>{subscriptionReceipt.planName} ({subscriptionReceipt.amount})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Evaluation End Date:</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>{subscriptionReceipt.trialEnds}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <a
                href={getOperatorPortalUrl()}
                style={{
                  flex: 1,
                  minWidth: '200px',
                  textAlign: 'center',
                  background: '#2563eb',
                  color: '#ffffff',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Launch Dealership Operator Portal →
              </a>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
