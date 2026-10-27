import { useEffect, useState } from 'react';
import type { VehicleDetailDto, DealershipProfile } from '@/lib/api/sdk.ts';
import { fetchDealershipProfile } from '@/lib/api/sdk.ts';

type Props = {
  vehicle: VehicleDetailDto;
  dealerId: string;
  isOpen: boolean;
  onClose: () => void;
};

export function WindowStickerModal({ vehicle, dealerId, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'sticker' | 'buyers-guide'>('sticker');
  const [profile, setProfile] = useState<DealershipProfile | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let live = true;
    fetchDealershipProfile(dealerId)
      .then(p => {
        if (live) setProfile(p);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [dealerId, isOpen]);

  if (!isOpen) return null;

  const dealerName = profile?.dbaName || profile?.legalName || '';
  const rooftop = profile?.rooftopAddress;
  const dealerAddress = rooftop
    ? [rooftop.street, rooftop.city, [rooftop.state, rooftop.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ')
    : '';
  const dealerPhone = profile?.primaryContact?.phone || '';
  const dealerWebsite = profile?.websiteUrl || window.location.host;

  const vehicleTitle = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''}`.trim();
  const priceDisplay =
    vehicle.priceCents > 0
      ? `$${(vehicle.priceCents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : 'Contact Dealer';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 overflow-y-auto">
      {/* Print isolation stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-sheet, #printable-sheet * {
            visibility: visible !important;
          }
          #printable-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[95vh] overflow-hidden border border-silver-200">
        {/* Modal Top Bar (Screen only) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-silver-200 bg-silver-50">
          <div className="flex items-center gap-3">
            <span className="text-xl">🖨️</span>
            <div>
              <h3 className="text-sm font-bold text-ink-heading">
                Print Vehicle Documents
              </h3>
              <p className="text-xs text-ink-muted">
                {vehicleTitle} · Stock #{vehicle.stockNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch */}
            <div className="inline-flex rounded-lg border border-silver-300 p-0.5 bg-silver-100 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('sticker')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'sticker'
                    ? 'bg-white text-ink-heading shadow-sm font-bold'
                    : 'text-ink-muted hover:text-ink-heading'
                }`}
              >
                Window Sticker
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('buyers-guide')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'buyers-guide'
                    ? 'bg-white text-ink-heading shadow-sm font-bold'
                    : 'text-ink-muted hover:text-ink-heading'
                }`}
              >
                FTC Buyers Guide
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-navy-800 hover:bg-navy-700 text-white shadow-sm transition-colors ml-2"
            >
              <span>Print Page</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-ink-muted hover:text-ink-heading hover:bg-silver-200 rounded-lg text-lg leading-none transition-colors ml-1"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-silver-100/60 flex justify-center">
          <div
            id="printable-sheet"
            className="w-full max-w-[800px] bg-white p-8 rounded-xl shadow-lg border border-silver-300 text-ink-heading"
          >
            {activeTab === 'sticker' ? (
              /* ─── TAB 1: MONRONEY / WINDOW STICKER ───────────────────────── */
              <div className="space-y-6">
                {/* Header: Dealership Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-4 border-navy-900 pb-4 gap-4">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-navy-950 uppercase">
                      {dealerName}
                    </h1>
                    <p className="text-xs font-medium text-ink-muted">{dealerAddress}</p>
                    <p className="text-xs font-medium text-ink-muted">
                      {[dealerPhone && `Tel: ${dealerPhone}`, dealerWebsite].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="text-right sm:self-center">
                    <span className="inline-block px-3 py-1 rounded bg-navy-900 text-white text-xs font-black uppercase tracking-wider">
                      Official Window Sticker
                    </span>
                  </div>
                </div>

                {/* Hero Title & Price Banner */}
                <div className="bg-navy-50/70 border-2 border-navy-900/20 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-navy-700 tracking-wider uppercase block">
                      {vehicle.condition ? `${vehicle.condition} ` : ''}Vehicle Specification
                    </span>
                    <h2 className="text-2xl font-black text-navy-950 mt-0.5">{vehicleTitle}</h2>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-ink-muted font-medium">
                      <span>
                        VIN: <strong className="font-mono text-ink-heading">{vehicle.vin}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Stock #{' '}
                        <strong className="font-mono text-ink-heading">{vehicle.stockNumber}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right bg-white p-3.5 rounded-lg border border-navy-200 shadow-sm shrink-0">
                    <span className="text-[10px] font-bold text-ink-muted uppercase block">
                      Internet Retail Price
                    </span>
                    <span className="text-3xl font-black text-navy-950 tracking-tight block">
                      {priceDisplay}
                    </span>
                    <span className="text-[9px] text-ink-muted block mt-0.5">
                      Plus tax, title, license & dealer fees
                    </span>
                  </div>
                </div>

                {/* Technical Specifications Grid */}
                <div>
                  <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider border-b border-silver-200 pb-1 mb-3">
                    Vehicle Specifications & Powertrain
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 bg-silver-50 rounded-lg border border-silver-200">
                      <span className="text-[10px] text-ink-muted font-medium block">Mileage</span>
                      <strong className="text-ink-heading text-sm">
                        {vehicle.mileage > 0 ? `${vehicle.mileage.toLocaleString()} mi` : '—'}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-silver-50 rounded-lg border border-silver-200">
                      <span className="text-[10px] text-ink-muted font-medium block">Exterior Color</span>
                      <strong className="text-ink-heading text-sm capitalize">
                        {vehicle.exteriorColor || '—'}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-silver-50 rounded-lg border border-silver-200">
                      <span className="text-[10px] text-ink-muted font-medium block">Interior Color</span>
                      <strong className="text-ink-heading text-sm capitalize">
                        {vehicle.interiorColor || '—'}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-silver-50 rounded-lg border border-silver-200">
                      <span className="text-[10px] text-ink-muted font-medium block">Transmission</span>
                      <strong className="text-ink-heading text-sm capitalize">
                        {vehicle.transmission || '—'}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-silver-50 rounded-lg border border-silver-200">
                      <span className="text-[10px] text-ink-muted font-medium block">Drivetrain</span>
                      <strong className="text-ink-heading text-sm uppercase">
                        {vehicle.drivetrain || '—'}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-silver-50 rounded-lg border border-silver-200">
                      <span className="text-[10px] text-ink-muted font-medium block">Fuel Type</span>
                      <strong className="text-ink-heading text-sm capitalize">
                        {vehicle.fuelType || '—'}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-silver-50 rounded-lg border border-silver-200">
                      <span className="text-[10px] text-ink-muted font-medium block">Body Style</span>
                      <strong className="text-ink-heading text-sm capitalize">
                        {vehicle.bodyStyle || '—'}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-silver-50 rounded-lg border border-silver-200">
                      <span className="text-[10px] text-ink-muted font-medium block">Lot Status</span>
                      <strong className="text-emerald-700 text-sm font-bold">
                        {vehicle.listingStatus === 'READY' ? 'Verified Ready' : 'In Stock'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Features & Options Checklist */}
                <div>
                  <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider border-b border-silver-200 pb-1 mb-3">
                    Installed Features & Options
                  </h3>
                  {vehicle.options && vehicle.options.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
                      {vehicle.options.slice(0, 15).map((opt, i) => (
                        <div key={i} className="flex items-center gap-1.5 truncate">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span className="truncate text-ink-heading">{opt}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Never print equipment the dealer has not recorded for this vehicle.
                    <p className="text-xs text-ink-muted">No options recorded for this vehicle.</p>
                  )}
                </div>

                {/* Bottom Row: Disclaimers */}
                <div className="border-t-2 border-navy-900 pt-4 flex flex-col sm:flex-row items-center justify-end gap-6">
                  <div className="text-right text-[10px] text-ink-muted leading-tight max-w-xs">
                    <p>
                      Accuracy of descriptions, pricing, and options is deemed reliable but not guaranteed. Actual mileage may vary. Verify all equipment with sales representative prior to purchase.
                    </p>
                    <p className="mt-1 font-bold text-ink-heading">
                      Generated by StarterGrid Dealer Platform
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* ─── TAB 2: FTC BUYERS GUIDE (16 CFR Part 455) ─────────────── */
              <div className="space-y-6 text-black font-sans leading-tight">
                {/* Official FTC Header */}
                <div className="border-b-4 border-black pb-3 text-center">
                  <h1 className="text-4xl font-black tracking-wider uppercase text-black">
                    BUYERS GUIDE
                  </h1>
                  <p className="text-xs font-bold uppercase tracking-tight mt-1">
                    IMPORTANT: Spoken promises are difficult to enforce. Ask the dealer to put all promises in writing. Keep this form.
                  </p>
                </div>

                {/* Vehicle Identifiers */}
                <div className="grid grid-cols-4 gap-2 border-b-2 border-black pb-3 text-xs font-bold">
                  <div>
                    <span className="block text-[10px] uppercase font-normal text-gray-700">Vehicle Make</span>
                    <span className="text-sm uppercase">{vehicle.make}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-normal text-gray-700">Model</span>
                    <span className="text-sm uppercase">{vehicle.model}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-normal text-gray-700">Model Year</span>
                    <span className="text-sm">{vehicle.year}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-normal text-gray-700">VIN</span>
                    <span className="text-sm font-mono">{vehicle.vin}</span>
                  </div>
                </div>

                {/* Warranties for this vehicle */}
                <div className="border-2 border-black p-4 space-y-4">
                  <h2 className="text-sm font-black uppercase tracking-wider border-b border-black pb-1">
                    WARRANTIES FOR THIS VEHICLE:
                  </h2>

                  {/* AS IS Checkbox */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 border-2 border-black flex items-center justify-center font-bold text-lg shrink-0">
                      ✓
                    </div>
                    <div>
                      <strong className="text-sm font-black uppercase block">
                        AS IS - NO DEALER WARRANTY
                      </strong>
                      <p className="text-xs text-gray-800 mt-0.5">
                        THE DEALER DOES NOT PROVIDE A WARRANTY FOR ANY REPAIRS AFTER SALE. YOU WILL PAY ALL COSTS FOR ANY REPAIRS.
                      </p>
                    </div>
                  </div>

                  {/* DEALER WARRANTY Checkbox */}
                  <div className="flex items-start gap-3 border-t border-gray-300 pt-3">
                    <div className="w-6 h-6 border-2 border-black shrink-0" />
                    <div>
                      <strong className="text-sm font-black uppercase block">
                        DEALER WARRANTY
                      </strong>
                      <p className="text-xs text-gray-800 mt-0.5">
                        FULL WARRANTY / LIMITED WARRANTY. The dealer will pay ___% of the labor and ___% of the parts for covered systems that fail during the warranty period. Ask the dealer for a copy of the warranty document.
                      </p>
                    </div>
                  </div>

                  {/* NON-DEALER WARRANTIES */}
                  <div className="flex items-start gap-3 border-t border-gray-300 pt-3">
                    <div className="w-6 h-6 border-2 border-black flex items-center justify-center font-bold text-lg shrink-0">
                      ✓
                    </div>
                    <div>
                      <strong className="text-xs font-black uppercase block">
                        NON-DEALER WARRANTIES FOR THIS VEHICLE:
                      </strong>
                      <p className="text-xs text-gray-800 mt-0.5">
                        MANUFACTURER&apos;S ORIGINAL WARRANTY STILL APPLIES. The manufacturer&apos;s original warranty may still cover this vehicle. Ask the dealer for details regarding coverage and unexpired terms.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Service Contract Advisory */}
                <div className="border border-black p-3 text-xs">
                  <strong className="font-bold uppercase block">SERVICE CONTRACT:</strong>
                  <p className="mt-0.5">
                    A service contract on this vehicle is available for an extra charge. Ask for details as to coverage, deductible, and price. If you buy a service contract within 90 days of the time of sale, state law may provide implied warranties.
                  </p>
                </div>

                {/* Pre-purchase inspection */}
                <div className="border border-black p-3 text-xs">
                  <strong className="font-bold uppercase block">PRE-PURCHASE INSPECTION:</strong>
                  <p className="mt-0.5">
                    ASK THE DEALER IF YOU MAY HAVE THIS VEHICLE INSPECTED BY YOUR MECHANIC OR BY AN INDEPENDENT INSPECTION SERVICE ON OR OFF THE PREMISES.
                  </p>
                </div>

                {/* Spanish Translation Notice */}
                <p className="text-[11px] italic text-gray-700">
                  Si usted no puede leer este documento en inglés, pídale a un representante del concesionario que le proporcione una copia en español.
                </p>

                {/* Dealer contact info box */}
                <div className="border-t-2 border-black pt-3 flex flex-col sm:flex-row justify-between text-xs gap-4">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-700">
                      Dealership Name & Address
                    </span>
                    <strong className="block text-sm uppercase">{dealerName}</strong>
                    <span>{dealerAddress}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-700">
                      For Inquiries or Complaints Contact:
                    </span>
                    <span className="block">{dealerPhone}</span>
                    <span className="block">{dealerWebsite}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
