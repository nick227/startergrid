export type ApparelFields = {
  title: string;
  brand: string;
  size: string;
  color: string;
  material: string;
  era: string;
  measurements: string;
  conditionNotes: string;
};

type Props = {
  fields: ApparelFields;
  onChange: (fields: ApparelFields) => void;
  readOnly?: boolean;
};

const inputCls = 'w-full text-sm px-3 py-1.5 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:bg-silver-50 disabled:text-ink-muted';

function text(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === 'string' ? value : '';
}

export function apparelFieldsFromData(data: Record<string, unknown>): ApparelFields {
  return {
    title: text(data, 'title'),
    brand: text(data, 'brand'),
    size: text(data, 'size'),
    color: text(data, 'color'),
    material: text(data, 'material'),
    era: text(data, 'era'),
    measurements: text(data, 'measurements'),
    conditionNotes: text(data, 'conditionNotes'),
  };
}

export function apparelFieldsToData(fields: ApparelFields): Record<string, unknown> {
  return { ...fields };
}

export function ApparelItemFields({ fields, onChange, readOnly = false }: Props) {
  const set = (key: keyof ApparelFields) => (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...fields, [key]: event.target.value });

  const rows: { key: keyof ApparelFields; label: string }[] = [
    { key: 'title', label: 'Garment' },
    { key: 'brand', label: 'Brand' },
    { key: 'size', label: 'Size' },
    { key: 'color', label: 'Color' },
    { key: 'material', label: 'Material' },
    { key: 'era', label: 'Era' },
    { key: 'measurements', label: 'Measurements' },
    { key: 'conditionNotes', label: 'Condition notes' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {rows.map(row => (
        <div key={row.key} className={row.key === 'title' || row.key === 'conditionNotes' ? 'col-span-2' : undefined}>
          <label className="block text-[11px] font-semibold text-ink-muted mb-1">{row.label}</label>
          <input type="text" value={fields[row.key]} onChange={set(row.key)} disabled={readOnly} className={inputCls} />
        </div>
      ))}
    </div>
  );
}
