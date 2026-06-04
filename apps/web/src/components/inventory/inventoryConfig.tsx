import type { Column } from '../generic/DataTable.tsx';
import type { FieldDef } from '../generic/BulkActionBar.tsx';
import type { VehicleListItem } from '../../lib/types.ts';
import { Badge } from '../ui/Badge.tsx';
import type { BadgeColor } from '../ui/Badge.tsx';

// ── Readiness token map ───────────────────────────────────────────────────────

type Readiness = 'READY' | 'WARNING' | 'BLOCKED';

export const READINESS_CONFIG: Record<Readiness, {
  label: string;
  badgeColor: BadgeColor;
  dotColor: string;
  textColor: string;
  rowBg: string;
}> = {
  READY:   { label: 'Ready',   badgeColor: 'green', dotColor: 'bg-green-500', textColor: 'text-green-700', rowBg: '' },
  WARNING: { label: 'Warning', badgeColor: 'amber', dotColor: 'bg-amber-400', textColor: 'text-amber-700', rowBg: 'bg-amber-50/20' },
  BLOCKED: { label: 'Blocked', badgeColor: 'red',   dotColor: 'bg-red-500',   textColor: 'text-red-700',   rowBg: 'bg-red-50/40' },
};

// ── Readiness badge — dot style (table rows) or pill style (import preview) ──

export function ReadinessBadge({ readiness, style = 'dot' }: { readiness: Readiness; style?: 'dot' | 'pill' }) {
  const cfg = READINESS_CONFIG[readiness];
  if (style === 'dot') {
    return (
      <span className={`flex items-center gap-1 text-xs ${cfg.textColor}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor} inline-block`} />
        {cfg.label}
      </span>
    );
  }
  return <Badge color={cfg.badgeColor}>{cfg.label}</Badge>;
}

// ── Action badge (import preview) ─────────────────────────────────────────────

export function ActionBadge({ action }: { action: 'CREATE' | 'UPDATE' | 'SKIP' }) {
  if (action === 'CREATE') return <span className="text-xs text-green-700 font-medium">+ Create</span>;
  if (action === 'UPDATE') return <span className="text-xs text-blue-700 font-medium">↺ Update</span>;
  return <span className="text-xs text-slate-400">Skip</span>;
}

// ── Display helpers ───────────────────────────────────────────────────────────

function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

function formatMileage(mi: number) {
  return mi.toLocaleString() + ' mi';
}

// ── Vehicle table column definitions ─────────────────────────────────────────

export const VEHICLE_COLUMNS: Column<VehicleListItem>[] = [
  {
    key: 'stockNumber',
    label: 'Stock #',
    render: v => <span className="text-xs font-mono text-slate-700">{v.stockNumber}</span>,
  },
  {
    key: 'vehicle',
    label: 'Vehicle',
    render: v => (
      <div>
        <div className="text-xs text-slate-800">
          {v.year} {v.make} {v.model}
          {v.trim && <span className="text-slate-400"> · {v.trim}</span>}
        </div>
        <div className="text-xs font-mono text-slate-300 truncate max-w-[12rem]">{v.vin}</div>
      </div>
    ),
  },
  {
    key: 'mileage',
    label: 'Mileage',
    render: v => <span className="text-xs text-slate-600">{v.mileage > 0 ? formatMileage(v.mileage) : '—'}</span>,
  },
  {
    key: 'price',
    label: 'Price',
    render: v => <span className="text-xs text-slate-700 font-medium">{v.priceCents > 0 ? formatPrice(v.priceCents) : '—'}</span>,
  },
  {
    key: 'condition',
    label: 'Condition',
    render: v => <span className="text-xs text-slate-500">{v.condition}</span>,
  },
  {
    key: 'color',
    label: 'Color',
    render: v => <span className="text-xs text-slate-500 truncate block max-w-[8rem]">{v.exteriorColor}</span>,
  },
  {
    key: 'media',
    label: 'Media',
    render: v => (
      <span className={`text-xs ${v.mediaCount > 0 ? 'text-slate-500' : 'text-slate-300'}`}>
        {v.mediaCount} photo{v.mediaCount !== 1 ? 's' : ''}
      </span>
    ),
  },
  {
    key: 'readiness',
    label: 'Readiness',
    render: v => <ReadinessBadge readiness={v.readiness} />,
  },
];

// ── Summary strip item definitions ───────────────────────────────────────────

export const SUMMARY_STRIP_ITEMS: Array<{ key: string; label: string; colorClass: string }> = [
  { key: 'total',   label: 'Total',   colorClass: 'text-slate-700' },
  { key: 'ready',   label: 'Ready',   colorClass: 'text-green-700' },
  { key: 'warning', label: 'Warning', colorClass: 'text-amber-600' },
  { key: 'blocked', label: 'Blocked', colorClass: 'text-red-600'   },
];

// ── Bulk edit field definitions ───────────────────────────────────────────────

export const BULK_EDIT_FIELD_DEFS: FieldDef[] = [
  { key: 'priceDollars',  type: 'text',   placeholder: 'Price $',    width: 'w-24' },
  { key: 'mileage',       type: 'text',   placeholder: 'Mileage',    width: 'w-24' },
  { key: 'condition',     type: 'select', options: [
    { value: '',     label: 'Condition' },
    { value: 'NEW',  label: 'New'       },
    { value: 'USED', label: 'Used'      },
    { value: 'CPO',  label: 'CPO'       },
  ]},
  { key: 'exteriorColor', type: 'text', placeholder: 'Ext. color', width: 'w-28' },
  { key: 'interiorColor', type: 'text', placeholder: 'Int. color', width: 'w-28' },
  { key: 'bodyStyle',     type: 'text', placeholder: 'Body style', width: 'w-28' },
];

// ── Canonical field options (import column mapping) ───────────────────────────

export const CANONICAL_OPTIONS: { value: string; label: string }[] = [
  { value: '',              label: '(skip)'                        },
  { value: 'stockNumber',   label: 'Stock Number'                  },
  { value: 'vin',           label: 'VIN'                           },
  { value: 'year',          label: 'Year'                          },
  { value: 'make',          label: 'Make'                          },
  { value: 'model',         label: 'Model'                         },
  { value: 'trim',          label: 'Trim'                          },
  { value: 'mileage',       label: 'Mileage'                       },
  { value: 'price',         label: 'Price (dollars)'               },
  { value: 'condition',     label: 'Condition'                     },
  { value: 'exteriorColor', label: 'Exterior Color'                },
  { value: 'interiorColor', label: 'Interior Color'                },
  { value: 'bodyStyle',     label: 'Body Style'                    },
  { value: 'drivetrain',    label: 'Drivetrain'                    },
  { value: 'fuelType',      label: 'Fuel Type'                     },
  { value: 'transmission',  label: 'Transmission'                  },
  { value: 'photoUrls',     label: 'Photo URLs (comma-separated)'  },
];

// ── Wizard step labels for ImportModal ────────────────────────────────────────

export const IMPORT_WIZARD_STEPS = [
  { label: 'Upload'          },
  { label: 'Map columns'     },
  { label: 'Preview & import'},
];

// ── Cleanup filter type and config ────────────────────────────────────────────

export type CleanupFilter =
  | 'ALL' | 'READY' | 'WARNING' | 'BLOCKED'
  | 'MISSING_PHOTOS' | 'INVALID_VIN' | 'SUSPICIOUS_PRICE';

export type FilterChipDef = {
  key: CleanupFilter;
  label: string;
  color: 'green' | 'amber' | 'red';
};

// Extended filters that supplement the SummaryStrip (issue-specific)
export const CLEANUP_FILTER_DEFS: FilterChipDef[] = [
  { key: 'MISSING_PHOTOS',   label: 'Missing photos',    color: 'amber' },
  { key: 'INVALID_VIN',      label: 'Invalid VIN',       color: 'red'   },
  { key: 'SUSPICIOUS_PRICE', label: 'Suspicious price',  color: 'amber' },
];

export function applyCleanupFilter(vehicle: VehicleListItem, filter: CleanupFilter): boolean {
  switch (filter) {
    case 'ALL':             return true;
    case 'READY':           return vehicle.readiness === 'READY';
    case 'WARNING':         return vehicle.readiness === 'WARNING';
    case 'BLOCKED':         return vehicle.readiness === 'BLOCKED';
    case 'MISSING_PHOTOS':  return vehicle.issues.some(i => i.path === 'media');
    case 'INVALID_VIN':     return vehicle.issues.some(i => i.path === 'vin' && i.severity === 'FAIL');
    case 'SUSPICIOUS_PRICE':return vehicle.issues.some(i => i.path === 'priceCents');
    default:                return true;
  }
}

// Required canonical field display labels (used in mapping UX)
export const REQUIRED_FIELD_LABELS: Record<string, string> = {
  stockNumber: 'Stock Number',
  vin:         'VIN',
  year:        'Year',
  make:        'Make',
  model:       'Model',
  mileage:     'Mileage',
  price:       'Price',
  condition:   'Condition',
  exteriorColor: 'Exterior Color',
};
