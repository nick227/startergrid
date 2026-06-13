const VIDEO_RESOLUTIONS = ['4K', '1080p', '720p', '480p', 'Audio Only'] as const;

export type VideoFields = {
  title: string;
  creator: string;
  genre: string;
  resolution: string;
  durationSec: string;
  publishYear: string;
};

type Props = {
  fields: VideoFields;
  onChange: (fields: VideoFields) => void;
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

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

export function VideoItemFields({ fields, onChange, readOnly = false }: Props) {
  const set = (key: keyof VideoFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...fields, [key]: e.target.value });

  const durSec = parseInt(fields.durationSec, 10);

  return (
    <div className="space-y-3">
      <Field label="Title">
        <input type="text" value={fields.title} onChange={set('title')} disabled={readOnly}
          placeholder="Video title" className={inputCls} />
      </Field>

      <div className="flex gap-2">
        <div className="flex-1">
          <Field label="Creator">
            <input type="text" value={fields.creator} onChange={set('creator')} disabled={readOnly}
              placeholder="Creator or channel name" className={inputCls} />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Genre">
            <input type="text" value={fields.genre} onChange={set('genre')} disabled={readOnly}
              placeholder="e.g. Tutorial, Documentary" className={inputCls} />
          </Field>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="w-40">
          <Field label="Resolution">
            <select value={fields.resolution} onChange={set('resolution')} disabled={readOnly}
              className={`${inputCls} bg-white`}>
              <option value="">Select…</option>
              {VIDEO_RESOLUTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex-1">
          <Field label={`Duration (seconds)${!isNaN(durSec) && durSec > 0 ? ` — ${formatDuration(durSec)}` : ''}`}>
            <input type="number" value={fields.durationSec} onChange={set('durationSec')} disabled={readOnly}
              placeholder="e.g. 720" min={1} className={inputCls} />
          </Field>
        </div>
        <div className="w-28">
          <Field label="Publish Year">
            <input type="number" value={fields.publishYear} onChange={set('publishYear')} disabled={readOnly}
              placeholder="—" min={1900} max={2100} className={inputCls} />
          </Field>
        </div>
      </div>
    </div>
  );
}

export function videoFieldsFromData(data: Record<string, unknown>): VideoFields {
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    title:       str(data['title']),
    creator:     str(data['creator']),
    genre:       str(data['genre']),
    resolution:  str(data['resolution']),
    durationSec: data['durationSec'] != null ? String(data['durationSec']) : '',
    publishYear: data['publishYear'] != null ? String(data['publishYear']) : '',
  };
}

export function videoFieldsToData(fields: VideoFields): Record<string, unknown> {
  const data: Record<string, unknown> = { title: fields.title.trim() };
  if (fields.creator.trim())    data['creator']     = fields.creator.trim();
  if (fields.genre.trim())      data['genre']       = fields.genre.trim();
  if (fields.resolution.trim()) data['resolution']  = fields.resolution.trim();
  if (fields.durationSec)       data['durationSec'] = parseInt(fields.durationSec, 10);
  if (fields.publishYear)       data['publishYear'] = parseInt(fields.publishYear, 10);
  return data;
}
