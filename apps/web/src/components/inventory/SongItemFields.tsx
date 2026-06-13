const SONG_FORMATS = ['Digital Album', 'EP', 'Single', 'LP', 'Compilation'] as const;

export type SongFields = {
  title: string;
  artist: string;
  label: string;
  format: string;
  genre: string;
  trackCount: string;
  releaseYear: string;
  isrc: string;
};

type Props = {
  fields: SongFields;
  onChange: (fields: SongFields) => void;
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

export function SongItemFields({ fields, onChange, readOnly = false }: Props) {
  const set = (key: keyof SongFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...fields, [key]: e.target.value });

  return (
    <div className="space-y-3">
      <Field label="Title">
        <input type="text" value={fields.title} onChange={set('title')} disabled={readOnly}
          placeholder="Release title" className={inputCls} />
      </Field>

      <div className="flex gap-2">
        <div className="flex-1">
          <Field label="Artist">
            <input type="text" value={fields.artist} onChange={set('artist')} disabled={readOnly}
              placeholder="Artist or band name" className={inputCls} />
          </Field>
        </div>
        <div className="w-40">
          <Field label="Format">
            <select value={fields.format} onChange={set('format')} disabled={readOnly}
              className={`${inputCls} bg-white`}>
              {SONG_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Field label="Record Label">
            <input type="text" value={fields.label} onChange={set('label')} disabled={readOnly}
              placeholder="Label or imprint" className={inputCls} />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Genre">
            <input type="text" value={fields.genre} onChange={set('genre')} disabled={readOnly}
              placeholder="e.g. Pop, Rock, Jazz" className={inputCls} />
          </Field>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="w-28">
          <Field label="Tracks">
            <input type="number" value={fields.trackCount} onChange={set('trackCount')} disabled={readOnly}
              placeholder="—" min={1} className={inputCls} />
          </Field>
        </div>
        <div className="w-28">
          <Field label="Release Year">
            <input type="number" value={fields.releaseYear} onChange={set('releaseYear')} disabled={readOnly}
              placeholder="—" min={1900} max={2100} className={inputCls} />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="ISRC">
            <input type="text" value={fields.isrc} onChange={set('isrc')} disabled={readOnly}
              placeholder="USRC17XXXXXXX" maxLength={12} className={`${inputCls} font-mono`} />
          </Field>
        </div>
      </div>
    </div>
  );
}

export function songFieldsFromData(data: Record<string, unknown>): SongFields {
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    title:       str(data['title']),
    artist:      str(data['artist']),
    label:       str(data['label']),
    format:      str(data['format']) || 'Digital Album',
    genre:       str(data['genre']),
    trackCount:  data['trackCount'] != null ? String(data['trackCount']) : '',
    releaseYear: data['releaseYear'] != null ? String(data['releaseYear']) : '',
    isrc:        str(data['isrc']),
  };
}

export function songFieldsToData(fields: SongFields): Record<string, unknown> {
  const data: Record<string, unknown> = {
    title:  fields.title.trim(),
    format: fields.format,
  };
  if (fields.artist.trim())        data['artist']      = fields.artist.trim();
  if (fields.label.trim())         data['label']       = fields.label.trim();
  if (fields.genre.trim())         data['genre']       = fields.genre.trim();
  if (fields.trackCount)           data['trackCount']  = parseInt(fields.trackCount, 10);
  if (fields.releaseYear)          data['releaseYear'] = parseInt(fields.releaseYear, 10);
  if (fields.isrc.trim())          data['isrc']        = fields.isrc.trim();
  return data;
}
