import { useRef } from 'react';
import type { ParsedCSV } from '../../lib/parseCSV.ts';

type Props = {
  rawText: string;
  onChange: (text: string) => void;
  parsed: ParsedCSV | null;
};

export function ImportStepUpload({ rawText, onChange, parsed }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange(await file.text());
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Paste spreadsheet data (Excel/Google Sheets copy) or upload a CSV file.
      </p>
      <textarea
        value={rawText}
        onChange={e => onChange(e.target.value)}
        placeholder="Paste CSV or tab-separated rows here (first row = column headers)…"
        className="w-full h-48 px-3 py-2.5 text-xs font-mono border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex items-center gap-3">
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFile} />
        <button
          onClick={() => fileRef.current?.click()}
          className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Choose file (.csv / .tsv)
        </button>
        {parsed && (
          <span className="text-xs text-slate-500">
            Detected: <strong>{parsed.rows.length}</strong> rows, <strong>{parsed.headers.length}</strong> columns
          </span>
        )}
      </div>
      {rawText && !parsed && (
        <p className="text-xs text-red-500">Could not parse data — check that the first row is a header row.</p>
      )}
    </div>
  );
}
