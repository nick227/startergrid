import { useState, useEffect } from 'react';
import {
  fetchLeadDeliveryDetails,
  retryLeadDelivery,
  type LeadDeliveryDetailsDto,
} from '@/lib/api/leadsApi.ts';

type Props = {
  dealershipId: string;
  leadId: string;
  isOpen: boolean;
  onClose: () => void;
};

export function LeadCrmHandoffModal({ dealershipId, leadId, isOpen, onClose }: Props) {
  const [data, setData] = useState<LeadDeliveryDetailsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [overrideEmail, setOverrideEmail] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !leadId) return;
    let live = true;
    setLoading(true);
    setError(null);
    setDispatchSuccess(null);
    fetchLeadDeliveryDetails(dealershipId, leadId)
      .then(res => {
        if (live) {
          setData(res);
          setOverrideEmail(res.crmEndpoint || '');
        }
      })
      .catch(err => {
        if (live) setError(err.message || 'Failed to load CRM delivery status');
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
  }, [dealershipId, leadId, isOpen]);

  if (!isOpen) return null;

  const handleCopyXml = () => {
    if (!data?.adfXmlPayload) return;
    navigator.clipboard.writeText(data.adfXmlPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopySummary = () => {
    if (!data) return;
    const text = [
      `Inquiry: ${vehicleLabel}`,
      `Buyer: ${data.customer.name || 'Anonymous'}`,
      `Email: ${data.customer.email || 'N/A'}`,
      `Phone: ${data.customer.phone || 'N/A'}`,
      `Lead ID: ${leadId}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleDownload = () => {
    if (!data?.adfXmlPayload) return;
    const blob = new Blob([data.adfXmlPayload], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lead-adf-${data.vehicle?.stockNumber || leadId}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDispatch = async (markDelivered: boolean) => {
    setDispatching(true);
    setError(null);
    setDispatchSuccess(null);
    try {
      const updated = await retryLeadDelivery(dealershipId, leadId, {
        destinationEmail: overrideEmail.trim() || undefined,
        markDelivered,
      });
      setData(updated);
      setDispatchSuccess(
        markDelivered
          ? 'Lead transmitted to CRM endpoint. Awaiting CRM import processing.'
          : 'Lead delivery queued for transmission.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dispatch failed');
    } finally {
      setDispatching(false);
    }
  };

  const vehicleLabel = data?.vehicle
    ? `${data.vehicle.year || ''} ${data.vehicle.make || ''} ${data.vehicle.model || ''} (#${data.vehicle.stockNumber})`.trim()
    : 'General Vehicle Inquiry';

  const isDelivered = data?.deliveryStatus === 'DELIVERED';
  const isPending = data?.deliveryStatus === 'PENDING';
  const isFailed = data?.deliveryStatus === 'FAILED';

  const lastAttempt = data?.attempts && data.attempts.length > 0 ? data.attempts[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-silver-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-silver-200 bg-silver-50 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-ink-heading">CRM Delivery Status</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Check whether this lead has been transmitted to your dealership CRM.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink-heading hover:bg-silver-200 transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 flex items-start gap-2">
              <span className="text-base leading-none">⚠️</span>
              <div>
                <strong className="block font-semibold">Notice</strong>
                {error}
              </div>
            </div>
          )}

          {dispatchSuccess && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3.5 text-xs text-green-800 flex items-center gap-2 animate-in fade-in">
              <span className="text-base leading-none">✓</span>
              <span>{dispatchSuccess}</span>
            </div>
          )}

          {loading && !data ? (
            <div className="py-16 text-center text-sm text-ink-muted">
              Checking lead delivery status…
            </div>
          ) : data ? (
            <>
              {/* Primary Status Card */}
              <div
                className={`p-4 rounded-xl border flex flex-col gap-2 ${
                  isDelivered
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : isFailed
                    ? 'bg-red-50/70 border-red-200 text-red-950'
                    : isPending
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-blue-50/70 border-blue-200 text-blue-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide">
                    {isDelivered
                      ? '✓ Delivered to CRM Endpoint'
                      : isFailed
                      ? '✕ Transmission Failed'
                      : isPending
                      ? '⏳ Queued for CRM Delivery'
                      : 'Ready for CRM Handoff'}
                  </span>
                  {lastAttempt?.deliveredAt && (
                    <span className="text-[11px] opacity-75">
                      {new Date(lastAttempt.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                <p className="text-xs leading-relaxed">
                  {isDelivered
                    ? `Lead was sent to ${lastAttempt?.destinationAddress || data.crmEndpoint || 'your CRM endpoint'}. Your CRM will parse the lead and route it to your sales team.`
                    : isFailed
                    ? `Could not transmit to ${lastAttempt?.destinationAddress || data.crmEndpoint || 'CRM'}. Review address below and retry.`
                    : isPending
                    ? 'Transmission queued. StarterGrid will send to your CRM endpoint shortly.'
                    : 'Lead received. Transmit directly to your CRM inbox or copy details below.'}
                </p>
              </div>

              {/* Inquiry & Buyer Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-silver-200 bg-silver-50/60">
                  <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">
                    Inquiry Vehicle
                  </span>
                  <span className="text-sm font-bold text-ink-heading block mt-0.5">{vehicleLabel}</span>
                  <span className="text-ink-muted block mt-0.5">Stock #{data.vehicle?.stockNumber || 'N/A'}</span>
                </div>
                <div className="p-3.5 rounded-xl border border-silver-200 bg-silver-50/60">
                  <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">
                    Buyer Contact
                  </span>
                  <span className="text-sm font-bold text-ink-heading block mt-0.5">
                    {data.customer.name || 'Anonymous Buyer'}
                  </span>
                  <span className="text-ink-muted block mt-0.5">
                    {[data.customer.email, data.customer.phone].filter(Boolean).join(' · ') || 'No contact supplied'}
                  </span>
                </div>
              </div>

              {/* One-click Action Row */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={dispatching}
                  onClick={() => handleDispatch(true)}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-navy-800 hover:bg-navy-900 text-white transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>{dispatching ? 'Sending…' : isDelivered ? 'Resend to CRM' : 'Send to CRM'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-silver-300 bg-white hover:bg-silver-100 text-ink-heading transition-all shadow-sm"
                >
                  {copiedSummary ? '✓ Copied Summary' : 'Copy Lead Summary'}
                </button>
              </div>

              {/* Contextual Disclosure: Advanced ADF/XML & Technical Log */}
              <details className="rounded-xl border border-silver-200 bg-surface-card overflow-hidden">
                <summary className="px-4 py-3 bg-silver-50/70 hover:bg-silver-100/70 cursor-pointer text-xs font-bold text-ink-heading flex items-center justify-between transition-colors select-none">
                  <span>Advanced: Raw ADF/XML 1.0 & Transmission Log</span>
                  <span className="text-[11px] font-normal text-ink-muted">XML payload for CRM admins ▼</span>
                </summary>

                <div className="p-4 space-y-4 border-t border-silver-200 text-xs">
                  {/* Destination Endpoint config */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink-heading block">
                      CRM Inbound Email Endpoint:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={overrideEmail}
                        onChange={e => setOverrideEmail(e.target.value)}
                        placeholder="e.g. leads@crm-dealersocket.com"
                        className="field-input flex-1 text-xs font-mono"
                        disabled={dispatching}
                      />
                    </div>
                  </div>

                  {/* ADF/XML Payload Box */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                        Auto-lead Data Format (ADF/XML 1.0)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyXml}
                          className="px-2.5 py-1 text-xs font-semibold rounded border border-silver-300 bg-white hover:bg-silver-100 text-navy-800"
                        >
                          {copied ? '✓ Copied!' : 'Copy raw XML'}
                        </button>
                        <button
                          type="button"
                          onClick={handleDownload}
                          className="px-2.5 py-1 text-xs font-semibold rounded border border-silver-300 bg-white hover:bg-silver-100 text-ink-heading"
                        >
                          Download .xml
                        </button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-navy-950/20 bg-navy-950 p-3 font-mono text-[11px] text-gray-200 max-h-48 overflow-y-auto select-all">
                      <pre className="whitespace-pre-wrap break-all">{data.adfXmlPayload}</pre>
                    </div>
                  </div>

                  {/* Delivery Attempts */}
                  {data.attempts.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-silver-100">
                      <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">
                        Transmission Attempts
                      </span>
                      <div className="divide-y divide-silver-100 text-xs">
                        {data.attempts.map(att => (
                          <div key={att.id} className="py-2 flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-ink-heading">{att.destinationLabel}</span>
                              <span className="font-mono text-[11px] text-ink-muted block">{att.destinationAddress}</span>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                att.status === 'SENT' || att.status === 'DELIVERED'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {att.status}
                              </span>
                              <span className="text-[10px] text-ink-muted block mt-0.5">
                                {att.deliveredAt ? new Date(att.deliveredAt).toLocaleTimeString() : new Date(att.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-silver-200 bg-silver-50 flex items-center justify-between shrink-0 text-xs">
          <span className="text-ink-muted">
            Status: <strong>{isDelivered ? 'Transmitted to CRM' : 'Awaiting transmission'}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold rounded-lg bg-silver-200 hover:bg-silver-300 text-ink-heading transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
