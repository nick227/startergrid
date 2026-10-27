import { useEffect, useMemo, useState } from 'react';
import type { DealershipProfile } from '@/lib/api/sdk.ts';
import { fetchDealershipProfile } from '@/lib/api/sdk.ts';

export type WarrantyDisclosure = 'AS_IS' | 'DEALER_WARRANTY' | 'MANUFACTURER_WARRANTY';

export type PrintableVehicle = {
  id: string;
  vin: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  trim?: string | null;
  mileage: number;
  priceCents: number;
  condition?: string | null;
  exteriorColor?: string | null;
  interiorColor?: string | null;
  options?: string[];
  bodyStyle?: string | null;
  drivetrain?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  warrantyDisclosure?: WarrantyDisclosure | null;
};

type Props = {
  vehicle?: PrintableVehicle | null;
  vehicles?: PrintableVehicle[];
  dealerId: string;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'sticker' | 'buyers-guide';
};

function formatPrice(cents: number) {
  return cents > 0 ? `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'Contact Dealer';
}

type DealerInfo = {
  dealerName: string;
  dealerAddress: string;
  dealerPhone: string;
  dealerWebsite: string;
};

export function WindowStickerModal({
  vehicle,
  vehicles,
  dealerId,
  isOpen,
  onClose,
  initialTab = 'sticker',
}: Props) {
  const [activeTab, setActiveTab] = useState<'sticker' | 'buyers-guide'>(initialTab);
  const [profile, setProfile] = useState<DealershipProfile | null>(null);
  const [userWarrantyOverrides, setUserWarrantyOverrides] = useState<Record<string, WarrantyDisclosure>>({});

  const vehicleList: PrintableVehicle[] = useMemo(
    () => (vehicles && vehicles.length > 0 ? vehicles : vehicle ? [vehicle] : []),
    [vehicles, vehicle],
  );

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

  const getVehicleWarranty = (v: PrintableVehicle): WarrantyDisclosure | null => {
    if (userWarrantyOverrides[v.id]) return userWarrantyOverrides[v.id];
    if (v.warrantyDisclosure) return v.warrantyDisclosure;
    if (v.options?.some(o => /as[\s-]is/i.test(o))) return 'AS_IS';
    if (v.options?.some(o => /manufacturer\s+warranty|factory\s+warranty/i.test(o))) return 'MANUFACTURER_WARRANTY';
    return null;
  };

  const missingWarrantyVehicles = vehicleList.filter(v => !getVehicleWarranty(v));
  const canPrint = activeTab === 'sticker' || missingWarrantyVehicles.length === 0;

  if (!isOpen || vehicleList.length === 0) return null;

  const dealerName = profile?.dbaName || profile?.legalName || '';
  const rooftop = profile?.rooftopAddress;
  const dealerAddress = rooftop
    ? [rooftop.street, rooftop.city, [rooftop.state, rooftop.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ')
    : '';
  const dealerPhone = profile?.primaryContact?.phone || '';
  const dealerWebsite = profile?.websiteUrl || window.location.host;

  const dealerInfo: DealerInfo = {
    dealerName,
    dealerAddress,
    dealerPhone,
    dealerWebsite,
  };

  const handlePrint = () => {
    if (!canPrint) return;
    window.print();
  };

  const handleApplyAllAsIs = () => {
    const updated: Record<string, WarrantyDisclosure> = { ...userWarrantyOverrides };
    for (const v of vehicleList) {
      if (!getVehicleWarranty(v)) {
        updated[v.id] = 'AS_IS';
      }
    }
    setUserWarrantyOverrides(updated);
  };

  const handleApplyAllManufacturer = () => {
    const updated: Record<string, WarrantyDisclosure> = { ...userWarrantyOverrides };
    for (const v of vehicleList) {
      if (!getVehicleWarranty(v)) {
        updated[v.id] = 'MANUFACTURER_WARRANTY';
      }
    }
    setUserWarrantyOverrides(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 overflow-y-auto">
      {/* Print isolation stylesheet */}
      <style>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 0.5in;
          }
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
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-page {
            page-break-after: always !important;
            break-after: page !important;
            display: block !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin-bottom: 0 !important;
          }
          .print-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[95vh] overflow-hidden border border-silver-200">
        {/* Modal Top Bar (Screen only) */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-silver-200 bg-silver-50 gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">🖨️</span>
            <div>
              <h3 className="text-sm font-bold text-ink-heading">
                {vehicleList.length > 1 ? `Print Documents (${vehicleList.length} Vehicles)` : 'Print Documents'}
              </h3>
              <p className="text-xs text-ink-muted">
                {vehicleList.length === 1
                  ? `${vehicleList[0].year} ${vehicleList[0].make} ${vehicleList[0].model} · Stock #${vehicleList[0].stockNumber}`
                  : `${vehicleList.length} vehicles selected for batch printing · Each prints on a separate page`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tab switch */}
            <div className="inline-flex rounded-lg border border-silver-300 p-0.5 bg-silver-100 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('sticker')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'sticker'
                    ? 'bg-white text-ink-heading shadow-sm font-bold'
                    : 'text-ink-muted hover:text-ink-heading'
                }`}
              >
                <span>Window Sticker</span>
                <span className="text-[10px] font-normal opacity-70 hidden sm:inline">(Independent · Price & Specs)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('buyers-guide')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'buyers-guide'
                    ? 'bg-white text-ink-heading shadow-sm font-bold'
                    : 'text-ink-muted hover:text-ink-heading'
                }`}
              >
                <span>Buyers Guide</span>
                <span className="text-[10px] font-normal opacity-70 hidden sm:inline">(FTC Warranty)</span>
              </button>
            </div>

            <button
              type="button"
              disabled={!canPrint}
              onClick={handlePrint}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                canPrint
                  ? 'bg-navy-800 hover:bg-navy-700 text-white cursor-pointer'
                  : 'bg-silver-200 text-ink-muted opacity-60 cursor-not-allowed'
              }`}
              title={
                !canPrint
                  ? `Warranty Disclosure Required for ${missingWarrantyVehicles.length} vehicles before printing Buyers Guides`
                  : vehicleList.length > 1
                  ? `Print ${vehicleList.length} documents`
                  : 'Print document'
              }
            >
              <span>{vehicleList.length > 1 ? `🖨️ Print ${vehicleList.length} Documents` : '🖨️ Print Document'}</span>
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

        {/* Missing Warranty Verification Banner (FTC Rule Enforcement) */}
        {activeTab === 'buyers-guide' && missingWarrantyVehicles.length > 0 && (
          <div className="no-print mx-4 sm:mx-6 mt-4 p-4 rounded-xl border border-amber-300 bg-amber-50 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <span className="text-sm">⚠️</span>
                  <span>Warranty Disclosure Required ({missingWarrantyVehicles.length} of {vehicleList.length} vehicles pending)</span>
                </p>
                <p className="text-[11px] text-amber-900 mt-1 leading-snug">
                  FTC Buyers Guide regulations require verified warranty terms prior to lot display. Warranty declarations are factual statements; deliberately select terms for each vehicle or apply across pending units:
                </p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyAllAsIs}
                    className="px-3 py-1.5 text-xs font-semibold bg-white text-amber-950 border border-amber-300 hover:bg-amber-100 active:bg-amber-200 rounded-lg transition-colors shadow-2xs"
                    title="Apply AS IS terms to all pending vehicles"
                  >
                    Set pending to AS-IS
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyAllManufacturer}
                    className="px-3 py-1.5 text-xs font-semibold bg-white text-amber-950 border border-amber-300 hover:bg-amber-100 active:bg-amber-200 rounded-lg transition-colors shadow-2xs"
                    title="Apply Manufacturer Warranty terms to all pending vehicles"
                  >
                    Set pending to Manufacturer
                  </button>
                </div>
                <span className="text-[10px] text-amber-800">
                  Always review vehicle terms before printing. Manufacturer warranty requires unexpired factory coverage.
                </span>
              </div>
            </div>

            {/* Per-vehicle selector for pending units */}
            <div className="mt-3 grid gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto pt-2.5 border-t border-amber-200/80">
              {vehicleList.map(v => {
                const w = getVehicleWarranty(v);
                return (
                  <div
                    key={v.id}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2.5 transition-colors ${
                      !w ? 'bg-amber-100/70 border-amber-300 shadow-2xs' : 'bg-white border-silver-200'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${!w ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-ink-heading truncate">{v.year} {v.make} {v.model}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            !w ? 'bg-amber-200 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {!w ? 'Pending selection' : 'Selected'}
                          </span>
                        </div>
                        <span className="text-[10px] text-ink-muted font-mono block">Stock #{v.stockNumber}</span>
                      </div>
                    </div>
                    <select
                      value={w || ''}
                      onChange={e => setUserWarrantyOverrides(prev => ({ ...prev, [v.id]: e.target.value as WarrantyDisclosure }))}
                      className={`text-xs rounded-md border py-1.5 px-2 bg-white font-medium text-ink-heading shrink-0 cursor-pointer ${
                        !w ? 'border-amber-400 ring-1 ring-amber-300' : 'border-silver-300'
                      }`}
                    >
                      <option value="" disabled>Choose warranty…</option>
                      <option value="AS_IS">AS IS - No Dealer Warranty</option>
                      <option value="DEALER_WARRANTY">Dealer Warranty</option>
                      <option value="MANUFACTURER_WARRANTY">Manufacturer Warranty</option>
                    </select>
                  </div>
                );
              })}
            </div>

            <div className="mt-2.5 pt-2 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-amber-800">
              <span>Window stickers can be printed independently without warranty declarations.</span>
              <button
                type="button"
                onClick={() => setActiveTab('sticker')}
                className="font-semibold text-amber-950 underline hover:text-black cursor-pointer text-left sm:text-right"
              >
                Print Window Stickers independently →
              </button>
            </div>
          </div>
        )}

        {/* All Selected Success Banner */}
        {activeTab === 'buyers-guide' && missingWarrantyVehicles.length === 0 && (
          <div className="no-print mx-4 sm:mx-6 mt-4 p-3 rounded-xl border border-emerald-300 bg-emerald-50/70 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold shadow-2xs">
            <span className="flex items-center gap-1.5">
              <span className="text-base text-emerald-600">✓</span>
              <span>All {vehicleList.length} vehicles have warranty terms selected. Ready to print!</span>
            </span>
            <button
              type="button"
              onClick={handlePrint}
              className="self-start sm:self-auto px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors text-xs"
            >
              Print Buyers Guides
            </button>
          </div>
        )}

        {/* Scrollable Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-silver-100/60 flex justify-center">
          <div id="printable-sheet" className="w-full max-w-[800px] space-y-8">
            {vehicleList.map((v, index) => {
              const warranty = getVehicleWarranty(v);
              return (
                <div
                  key={v.id}
                  className="print-page bg-white p-8 rounded-xl shadow-lg border border-silver-300 text-ink-heading"
                >
                  {/* Screen-only page counter when printing multiple vehicles */}
                  {vehicleList.length > 1 && (
                    <div className="no-print mb-4 pb-2 border-b border-silver-200 flex items-center justify-between text-xs text-ink-muted">
                      <span className="font-bold text-navy-900">
                        Vehicle {index + 1} of {vehicleList.length} · {v.year} {v.make} {v.model}
                      </span>
                      <span className="font-mono">Stock #{v.stockNumber} · VIN {v.vin}</span>
                    </div>
                  )}

                  {activeTab === 'sticker' ? (
                    <WindowStickerCard vehicle={v} dealerInfo={dealerInfo} />
                  ) : (
                    <BuyersGuideCard
                      vehicle={v}
                      warranty={warranty}
                      dealerInfo={dealerInfo}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function WindowStickerCard({ vehicle, dealerInfo }: { vehicle: PrintableVehicle; dealerInfo: DealerInfo }) {
  const vehicleTitle = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''}`.trim();
  const priceDisplay = formatPrice(vehicle.priceCents);

  return (
    <div className="space-y-6">
      {/* Header: Dealership Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-4 border-navy-900 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-navy-950 uppercase">
            {dealerInfo.dealerName}
          </h1>
          <p className="text-xs font-medium text-ink-muted">{dealerInfo.dealerAddress}</p>
          <p className="text-xs font-medium text-ink-muted">
            {[dealerInfo.dealerPhone && `Tel: ${dealerInfo.dealerPhone}`, dealerInfo.dealerWebsite].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="text-right sm:self-center">
          <span className="inline-block px-3 py-1 rounded bg-navy-900 text-white text-xs font-black uppercase tracking-wider">
            Vehicle Window Sticker
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
              Stock # <strong className="font-mono text-ink-heading">{vehicle.stockNumber}</strong>
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
            <span className="text-[10px] text-ink-muted font-medium block">Drivetrain</span>
            <strong className="text-ink-heading text-sm uppercase">
              {vehicle.drivetrain || '—'}
            </strong>
          </div>

          <div className="p-2.5 bg-silver-50 rounded-lg border border-silver-200">
            <span className="text-[10px] text-ink-muted font-medium block">Transmission</span>
            <strong className="text-ink-heading text-sm capitalize">
              {vehicle.transmission || '—'}
            </strong>
          </div>

          <div className="p-2.5 bg-silver-50 rounded-lg border border-silver-200">
            <span className="text-[10px] text-ink-muted font-medium block">Body Style</span>
            <strong className="text-ink-heading text-sm capitalize">
              {vehicle.bodyStyle || '—'}
            </strong>
          </div>

          <div className="p-2.5 bg-silver-50 rounded-lg border border-silver-200">
            <span className="text-[10px] text-ink-muted font-medium block">Fuel Type</span>
            <strong className="text-ink-heading text-sm capitalize">
              {vehicle.fuelType || 'Gasoline'}
            </strong>
          </div>

          <div className="p-2.5 bg-silver-50 rounded-lg border border-silver-200">
            <span className="text-[10px] text-ink-muted font-medium block">Condition</span>
            <strong className="text-ink-heading text-sm uppercase">
              {vehicle.condition || 'USED'}
            </strong>
          </div>
        </div>
      </div>

      {/* Recorded Options & Packages */}
      <div>
        <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider border-b border-silver-200 pb-1 mb-3">
          Recorded Equipment & Features
        </h3>
        {vehicle.options && vehicle.options.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {vehicle.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-1.5 text-ink-body">
                <span className="text-navy-600 font-bold">✓</span>
                <span className="truncate">{opt}</span>
              </div>
            ))}
          </div>
        ) : (
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
            Generated by DealerGrid Dealer Platform
          </p>
        </div>
      </div>
    </div>
  );
}

function BuyersGuideCard({
  vehicle,
  warranty,
  dealerInfo,
}: {
  vehicle: PrintableVehicle;
  warranty: WarrantyDisclosure | null;
  dealerInfo: DealerInfo;
}) {
  const isAsIs = warranty === 'AS_IS';
  const isDealerWarranty = warranty === 'DEALER_WARRANTY';
  const isManufacturerWarranty = warranty === 'MANUFACTURER_WARRANTY';

  return (
    <div className="space-y-6 text-black font-sans leading-tight">
      <div className="no-print rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-[11px] text-amber-900 leading-snug">
        <strong>Lot display notice:</strong> Verify warranty disclosures against your state regulations and official disclosure form before vehicle placement.
      </div>

      {/* Buyers Guide Header */}
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
            {isAsIs ? '✓' : ''}
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
          <div className="w-6 h-6 border-2 border-black flex items-center justify-center font-bold text-lg shrink-0">
            {isDealerWarranty ? '✓' : ''}
          </div>
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
            {isManufacturerWarranty ? '✓' : ''}
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
          <strong className="block text-sm uppercase">{dealerInfo.dealerName}</strong>
          <span>{dealerInfo.dealerAddress}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-bold text-gray-700">
            For Inquiries or Complaints Contact:
          </span>
          <span className="block">{dealerInfo.dealerPhone}</span>
          <span className="block">{dealerInfo.dealerWebsite}</span>
        </div>
      </div>
    </div>
  );
}
