import React, { useState } from 'react';
import { INSPECTOR_VEHICLES, type InspectorVehicle } from '../../data/inspectorVehicles.ts';

export const VehicleInspectorSection: React.FC = () => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('f150');

  const vehicle = INSPECTOR_VEHICLES.find((v) => v.id === selectedVehicleId) || INSPECTOR_VEHICLES[0];

  const getStatusBadgeStyle = (variant: 'ready' | 'warning' | 'blocked') => {
    switch (variant) {
      case 'ready':
        return { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'blocked':
        return { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
    }
  };

  const badgeStyle = getStatusBadgeStyle(vehicle.statusBadgeVariant);

  return (
    <section
      id="preflight"
      style={{
        padding: '96px 24px',
        background: '#071321',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ maxWidth: '780px', marginBottom: '40px' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#34d399',
              marginBottom: '10px',
            }}
          >
            INTERACTIVE PRE-FLIGHT SENTRY
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
            Live Pre-Flight Vehicle Readiness Inspector
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.68)', fontSize: '1.0625rem', lineHeight: 1.6 }}>
            Most syndication systems send dirty data and leave dealers to discover feed errors in third-party error logs days later. StarterGrid inspects VIN check digits, the 6-slot automotive photo grid, and platform-specific schema requirements <strong>before</strong> compiling outbound feeds.
          </p>
        </div>

        {/* Interactive Vehicle Selector Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '24px' }}>
          {INSPECTOR_VEHICLES.map((v: InspectorVehicle) => {
            const isSelected = v.id === selectedVehicleId;
            const tabBadge = getStatusBadgeStyle(v.statusBadgeVariant);
            return (
              <button
                key={v.id}
                onClick={() => setSelectedVehicleId(v.id)}
                style={{
                  padding: '12px 18px',
                  borderRadius: '8px',
                  background: isSelected ? '#0d1e33' : 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid ' + (isSelected ? '#2563eb' : 'rgba(255, 255, 255, 0.08)'),
                  color: isSelected ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  minWidth: '220px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                    {v.year} {v.make} {v.model}
                  </span>
                  <span
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '3px',
                      background: tabBadge.bg,
                      color: tabBadge.color,
                      border: `1px solid ${tabBadge.border}`,
                    }}
                  >
                    {v.overallStatus}
                  </span>
                </div>
                <span style={{ fontSize: '0.6875rem', fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.45)' }}>
                  VIN: {v.vin.substring(0, 11)}...
                </span>
              </button>
            );
          })}
        </div>

        {/* Inspector Detail Box */}
        <div
          style={{
            background: '#0d1e33',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          {/* Top Bar: Vehicle Overview */}
          <div
            style={{
              padding: '24px 32px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(7, 19, 33, 0.7)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <h3 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#fff' }}>
                  {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
                </h3>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: badgeStyle.bg,
                    color: badgeStyle.color,
                    border: `1px solid ${badgeStyle.border}`,
                  }}
                >
                  {vehicle.overallStatus}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.65)', fontFamily: 'monospace' }}>
                <span>VIN: <strong style={{ color: '#fff' }}>{vehicle.vin}</strong></span>
                <span>Stock: <strong style={{ color: '#fff' }}>{vehicle.stockNumber}</strong></span>
                <span>Price: <strong style={{ color: '#34d399' }}>${vehicle.price.toLocaleString()}</strong></span>
                <span>Mileage: <strong style={{ color: '#fff' }}>{vehicle.mileage.toLocaleString()} mi</strong></span>
                <span>Photos: <strong style={{ color: vehicle.photoCount >= vehicle.photoTarget ? '#34d399' : '#f87171' }}>{vehicle.photoCount}/{vehicle.photoTarget}</strong></span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontFamily: 'monospace',
                }}
              >
                Category: {vehicle.bodyStyle} • {vehicle.fuelType}
              </span>
            </div>
          </div>

          {/* 2-Column Inspector Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
              padding: '32px',
            }}
          >
            {/* Left: 17-Point Pre-Flight Checks */}
            <div>
              <h4
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'rgba(255, 255, 255, 0.45)',
                  marginBottom: '16px',
                }}
              >
                Pre-Flight Validation Audit ({vehicle.checks.length} rules checked)
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {vehicle.checks.map((chk) => (
                  <div
                    key={chk.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      background: 'rgba(7, 19, 33, 0.6)',
                      border: '1px solid ' + (chk.status === 'blocked' ? 'rgba(239, 68, 68, 0.3)' : chk.status === 'warning' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.06)'),
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>
                        {chk.label}
                      </span>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          fontFamily: 'monospace',
                          background: chk.status === 'passed' ? 'rgba(16, 185, 129, 0.15)' : chk.status === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: chk.status === 'passed' ? '#34d399' : chk.status === 'warning' ? '#fbbf24' : '#f87171',
                        }}
                      >
                        {chk.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.4, margin: 0 }}>
                      {chk.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Per-Channel Readiness Gates */}
            <div>
              <h4
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'rgba(255, 255, 255, 0.45)',
                  marginBottom: '16px',
                }}
              >
                Channel Readiness Gate Evaluation
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {vehicle.channelReadiness.map((cr, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '8px',
                      background: 'rgba(7, 19, 33, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>
                        {cr.channelName}
                      </span>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: cr.status === 'Ready' ? 'rgba(16, 185, 129, 0.15)' : cr.status === 'Needs Attention' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: cr.status === 'Ready' ? '#34d399' : cr.status === 'Needs Attention' ? '#fbbf24' : '#f87171',
                          border: '1px solid ' + (cr.status === 'Ready' ? 'rgba(16, 185, 129, 0.3)' : cr.status === 'Needs Attention' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'),
                        }}
                      >
                        {cr.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.4 }}>
                      {cr.reason}
                    </div>
                  </div>
                ))}
              </div>

              {/* Operational Rule Callout */}
              <div
                style={{
                  marginTop: '20px',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  background: 'rgba(37, 99, 235, 0.08)',
                  border: '1px solid rgba(37, 99, 235, 0.25)',
                  fontSize: '0.75rem',
                  lineHeight: 1.5,
                  color: 'rgba(255, 255, 255, 0.8)',
                }}
              >
                <strong style={{ color: '#60a5fa' }}>Operational Sentry Rule:</strong> Ready to send is not the same as already published. StarterGrid gates vehicle distribution until all required fields match destination specifications, eliminating silent feed drops and platform penalty downgrades.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
