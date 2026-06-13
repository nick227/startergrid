export type DigitalArtFields = {
  title: string;
  artist: string;
  series: string;
  medium: string;
  editionId: string;
  editionSize: string;
  createdYear: string;
};

type Props = {
  fields: DigitalArtFields;
  onChange: (fields: DigitalArtFields) => void;
  readOnly?: boolean;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-ink-muted mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full text-sm px-3 py-1.5 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:bg-silver-50 disabled:text-ink-muted';

export function DigitalArtItemFields({ fields, onChange, readOnly = false }: Props) {
  const set = (key: keyof DigitalArtFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...fields, [key]: e.target.value });

  return (
    <div className="space-y-3">
      <Field label="Title">
        <input type="text" value={fields.title} onChange={set('title')} disabled={readOnly}
          placeholder="Artwork title" className={inputCls} />
      </Field>

      <div className="flex gap-2">
        <div className="flex-1">
          <Field label="Artist">
            <input type="text" value={fields.artist} onChange={set('artist')} disabled={readOnly}
              placeholder="Artist name" className={inputCls} />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Series / Collection">
            <input type="text" value={fields.series} onChange={set('series')} disabled={readOnly}
              placeholder="Optional series name" className={inputCls} />
          </Field>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Field label="Medium / Technique">
            <input type="text" value={fields.medium} onChange={set('medium')} disabled={readOnly}
              placeholder="e.g. Digital Print, Generative" className={inputCls} />
          </Field>
        </div>
        <div className="w-32">
          <Field label="Year Created">
            <input type="number" value={fields.createdYear} onChange={set('createdYear')} disabled={readOnly}
              placeholder="—" min={1900} max={2100} className={inputCls} />
          </Field>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Field label="Edition #">
            <input type="text" value={fields.editionId} onChange={set('editionId')} disabled={readOnly}
              placeholder="e.g. 42 of 100" className={`${inputCls} font-mono`} />
          </Field>
        </div>
        <div className="w-36">
          <Field label="Edition Size">
            <input type="number" value={fields.editionSize} onChange={set('editionSize')} disabled={readOnly}
              placeholder="Total prints" min={1} className={inputCls} />
          </Field>
        </div>
      </div>
    </div>
  );
}

export function digitalArtFieldsFromData(data: Record<string, unknown>): DigitalArtFields {
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    title:       str(data['title']),
    artist:      str(data['artist']),
    series:      str(data['series']),
    medium:      str(data['medium']),
    editionId:   str(data['editionId']),
    editionSize: data['editionSize'] != null ? String(data['editionSize']) : '',
    createdYear: data['createdYear'] != null ? String(data['createdYear']) : '',
  };
}

export function digitalArtFieldsToData(fields: DigitalArtFields): Record<string, unknown> {
  const data: Record<string, unknown> = { title: fields.title.trim() };
  if (fields.artist.trim())    data['artist']      = fields.artist.trim();
  if (fields.series.trim())    data['series']      = fields.series.trim();
  if (fields.medium.trim())    data['medium']      = fields.medium.trim();
  if (fields.editionId.trim()) data['editionId']   = fields.editionId.trim();
  if (fields.editionSize)      data['editionSize'] = parseInt(fields.editionSize, 10);
  if (fields.createdYear)      data['createdYear'] = parseInt(fields.createdYear, 10);
  return data;
}
