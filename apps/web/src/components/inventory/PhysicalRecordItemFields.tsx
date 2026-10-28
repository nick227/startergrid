import { PHYSICAL_RECORD_FORMATS } from '@auto-dealer/category-schemas';

export type PhysicalRecordFields = {
  title: string;
  artist: string;
  format: string;
  catalogNumber: string;
  label: string;
};

type Props = {
  fields: PhysicalRecordFields;
  onChange: (fields: PhysicalRecordFields) => void;
  readOnly?: boolean;
};

const inputCls = 'w-full text-sm px-3 py-1.5 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:bg-silver-50 disabled:text-ink-muted';

function text(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === 'string' ? value : '';
}

export function physicalRecordFieldsFromData(data: Record<string, unknown>): PhysicalRecordFields {
  return {
    title: text(data, 'title'),
    artist: text(data, 'artist'),
    format: text(data, 'format') || 'Vinyl LP',
    catalogNumber: text(data, 'catalogNumber'),
    label: text(data, 'label'),
  };
}

export function physicalRecordFieldsToData(fields: PhysicalRecordFields): Record<string, unknown> {
  return { ...fields };
}

export function PhysicalRecordItemFields({ fields, onChange, readOnly = false }: Props) {
  const set = (key: keyof PhysicalRecordFields) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...fields, [key]: event.target.value });

  return (
    <div className="space-y-3">
      <label className="block text-[11px] font-semibold text-ink-muted">Title
        <input value={fields.title} onChange={set('title')} disabled={readOnly} className={`mt-1 ${inputCls}`} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-[11px] font-semibold text-ink-muted">Artist
          <input value={fields.artist} onChange={set('artist')} disabled={readOnly} className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block text-[11px] font-semibold text-ink-muted">Format
          <select value={fields.format} onChange={set('format')} disabled={readOnly} className={`mt-1 ${inputCls} bg-white`}>
            {PHYSICAL_RECORD_FORMATS.map(format => <option key={format} value={format}>{format}</option>)}
          </select>
        </label>
        <label className="block text-[11px] font-semibold text-ink-muted">Catalog number
          <input value={fields.catalogNumber} onChange={set('catalogNumber')} disabled={readOnly} className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block text-[11px] font-semibold text-ink-muted">Label
          <input value={fields.label} onChange={set('label')} disabled={readOnly} className={`mt-1 ${inputCls}`} />
        </label>
      </div>
    </div>
  );
}
