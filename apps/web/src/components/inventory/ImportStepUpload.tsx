import { useRef, useState } from 'react';
import type { ParsedCSV } from '../../lib/parseCSV.ts';

type Props = {
  rawText: string;
  onChange: (text: string) => void;
  parsed: ParsedCSV | null;
};

export function ImportStepUpload({ rawText, onChange, parsed }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const readVersion = useRef(0);

  const readFile = async (file?: File) => {
    if (!file) return;
    const version = ++readVersion.current;
    setFileError(null);
    if (!/\.(csv|tsv|txt)$/i.test(file.name)) {
      setFileError('Choose a CSV, TSV or text file.');
      return;
    }
    try {
      const text = await file.text();
      if (version === readVersion.current) onChange(text);
    } catch {
      if (version === readVersion.current) setFileError('Could not read this file. Try choosing it again.');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Paste spreadsheet data (Excel/Google Sheets copy) or upload a CSV file.
      </p>
      <textarea
        aria-label="Spreadsheet data"
        value={rawText}
        onChange={e => { readVersion.current++; setFileError(null); onChange(e.target.value); }}
        placeholder="Paste CSV or tab-separated rows here (first row = column headers)…"
        className="w-full h-48 px-3 py-2.5 text-xs font-mono border border-silver-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-navy-500/30"
      />
      <div
        className={`flex flex-wrap items-center gap-3 rounded-lg border-2 border-dashed p-4 ${dragging ? 'border-navy-500 bg-surface-inset' : 'border-silver-300'}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false); }}
        onDrop={e => {
          e.preventDefault(); setDragging(false);
          if (e.dataTransfer.files.length !== 1) { setFileError('Drop one spreadsheet file at a time.'); return; }
          void readFile(e.dataTransfer.files[0]);
        }}
      >
        <span className="text-sm text-ink-muted">Drop a spreadsheet here, or</span>
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={e => { void readFile(e.target.files?.[0]); e.target.value = ''; }} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="px-3 py-1.5 text-xs border border-silver-300 rounded-lg hover:bg-surface-inset transition-colors"
        >
          Choose file (.csv / .tsv)
        </button>
        {parsed && (
          <span className="text-xs text-ink-muted">
            Detected: <strong>{parsed.rows.length}</strong> rows, <strong>{parsed.headers.length}</strong> columns
          </span>
        )}
      </div>
      {fileError && <p role="alert" className="text-sm text-red-600">{fileError}</p>}
      {rawText && !parsed && (
        <p className="text-xs text-red-500">Could not parse data — check that the first row is a header row.</p>
      )}
    </div>
  );
}
