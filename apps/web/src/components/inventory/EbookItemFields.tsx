const EBOOK_FORMATS = ['EPUB', 'PDF', 'MOBI', 'AUDIOBOOK', 'PRINT'] as const;

export type EbookFields = {
  title: string;
  author: string;
  publisher: string;
  format: string;
  language: string;
  pageCount: string;
  isbn: string;
  asin: string;
};

type Props = {
  fields: EbookFields;
  onChange: (fields: EbookFields) => void;
  readOnly?: boolean;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-ink-muted mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full text-sm px-3 py-1.5 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:bg-silver-50 disabled:text-ink-muted';

export function EbookItemFields({ fields, onChange, readOnly = false }: Props) {
  const set = (key: keyof EbookFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...fields, [key]: e.target.value });

  return (
    <div className="space-y-3">
      <Field label="Title">
        <input
          type="text"
          value={fields.title}
          onChange={set('title')}
          disabled={readOnly}
          placeholder="Book title"
          className={inputCls}
        />
      </Field>

      <div className="flex gap-2">
        <div className="flex-1">
          <Field label="Author">
            <input
              type="text"
              value={fields.author}
              onChange={set('author')}
              disabled={readOnly}
              placeholder="Author name"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="w-36">
          <Field label="Format">
            <select
              value={fields.format}
              onChange={set('format')}
              disabled={readOnly}
              className={`${inputCls} bg-white`}
            >
              {EBOOK_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Field label="Publisher">
            <input
              type="text"
              value={fields.publisher}
              onChange={set('publisher')}
              disabled={readOnly}
              placeholder="Publisher name"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="w-28">
          <Field label="Language">
            <input
              type="text"
              value={fields.language}
              onChange={set('language')}
              disabled={readOnly}
              placeholder="English"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="w-24">
          <Field label="Pages">
            <input
              type="number"
              value={fields.pageCount}
              onChange={set('pageCount')}
              disabled={readOnly}
              placeholder="—"
              min={1}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Field label="ISBN">
            <input
              type="text"
              value={fields.isbn}
              onChange={set('isbn')}
              disabled={readOnly}
              placeholder="978XXXXXXXXXX"
              maxLength={13}
              className={`${inputCls} font-mono`}
            />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="ASIN">
            <input
              type="text"
              value={fields.asin}
              onChange={set('asin')}
              disabled={readOnly}
              placeholder="Amazon ASIN"
              className={`${inputCls} font-mono`}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

export function ebookFieldsFromData(data: Record<string, unknown>): EbookFields {
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    title:     str(data['title']),
    author:    str(data['author']),
    publisher: str(data['publisher']),
    format:    str(data['format']) || 'EPUB',
    language:  str(data['language']) || 'English',
    pageCount: data['pageCount'] != null ? String(data['pageCount']) : '',
    isbn:      str(data['isbn']),
    asin:      str(data['asin']),
  };
}

export function ebookFieldsToData(fields: EbookFields): Record<string, unknown> {
  const data: Record<string, unknown> = {
    title:  fields.title.trim(),
    format: fields.format,
  };
  if (fields.author.trim())    data['author']    = fields.author.trim();
  if (fields.publisher.trim()) data['publisher'] = fields.publisher.trim();
  if (fields.language.trim())  data['language']  = fields.language.trim();
  if (fields.pageCount)        data['pageCount'] = parseInt(fields.pageCount, 10);
  if (fields.isbn.trim())      data['isbn']      = fields.isbn.trim();
  if (fields.asin.trim())      data['asin']      = fields.asin.trim();
  return data;
}
