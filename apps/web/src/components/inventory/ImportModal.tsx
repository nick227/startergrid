import { useState, useEffect } from 'react';
import { parseCSV } from '@/lib/parseCSV.ts';
import type { ParsedCSV } from '@/lib/parseCSV.ts';
import { previewInventoryImport, commitInventoryImport } from '@/lib/api.ts';
import type { ImportPreviewResponse, CommitImportResponse } from '@/lib/types.ts';
import { WizardModal } from '@/components/generic/WizardModal.tsx';
import { ImportStepUpload } from './ImportStepUpload.tsx';
import { ImportStepMapping } from './ImportStepMapping.tsx';
import { ImportStepPreview } from './ImportStepPreview.tsx';
import { IMPORT_WIZARD_STEPS } from './inventoryConfig.tsx';

type Props = {
  dealerId: string;
  onClose: () => void;
  onCommitted: (result: CommitImportResponse) => void;
};

export function ImportModal({ dealerId, onClose, onCommitted }: Props) {
  const [step, setStep] = useState(0);
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [userSkips, setUserSkips] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setUserSkips(new Set()); }, [preview]);

  const handleTextChange = (text: string) => {
    setRawText(text);
    if (!text.trim()) { setParsed(null); return; }
    const p = parseCSV(text);
    setParsed(p.rows.length > 0 ? p : null);
  };

  const handlePreview = async () => {
    if (!parsed) return;
    setLoading(true);
    setError(null);
    try {
      const result = await previewInventoryImport(dealerId, parsed.rows, mapping);
      setPreview(result);
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!parsed || !preview) return;
    setCommitting(true);
    try {
      const rowsToCommit = parsed.rows.filter((_, i) => {
        const previewRow = preview.rows[i];
        return previewRow && !userSkips.has(previewRow.rowIndex);
      });
      const result = await commitInventoryImport(dealerId, rowsToCommit, mapping);
      onCommitted(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed');
      setCommitting(false);
    }
  };

  const toggleSkip = (rowIndex: number) =>
    setUserSkips(s => { const n = new Set(s); n.has(rowIndex) ? n.delete(rowIndex) : n.add(rowIndex); return n; });

  const commitableCount = preview
    ? preview.rows.filter(r =>
        (r.action === 'CREATE' || r.action === 'UPDATE') && !userSkips.has(r.rowIndex)
      ).length
    : 0;

  const primaryLabel =
    step === 0 ? 'Continue →' :
    step === 1 ? (loading ? 'Loading…' : 'Preview →') :
    committing ? 'Importing…' : `Import ${commitableCount} vehicle${commitableCount !== 1 ? 's' : ''}`;

  const primaryDisabled =
    step === 0 ? !parsed :
    step === 1 ? loading :
    committing || commitableCount === 0;

  const handlePrimary = () => {
    if (step === 0) { setMapping({}); setStep(1); return; }
    if (step === 1) { void handlePreview(); return; }
    void handleCommit();
  };

  return (
    <WizardModal
      title="Import Inventory"
      steps={IMPORT_WIZARD_STEPS}
      step={step}
      onClose={onClose}
      onBack={step > 0 ? () => setStep(s => s - 1) : undefined}
      primaryLabel={primaryLabel}
      primaryDisabled={primaryDisabled}
      primaryLoading={loading || committing}
      onPrimary={handlePrimary}
    >
      {step === 0 && (
        <ImportStepUpload rawText={rawText} onChange={handleTextChange} parsed={parsed} />
      )}
      {step === 1 && parsed && (
        <ImportStepMapping
          headers={parsed.headers}
          rows={parsed.rows}
          mapping={mapping}
          suggestedMapping={preview?.suggestedMapping ?? {}}
          onChange={(h, v) => setMapping(m => ({ ...m, [h]: v }))}
          error={error}
        />
      )}
      {step === 2 && preview && (
        <ImportStepPreview
          preview={preview}
          error={error}
          userSkips={userSkips}
          onSkipToggle={toggleSkip}
        />
      )}
    </WizardModal>
  );
}
