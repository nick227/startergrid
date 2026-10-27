import { useDocReader } from './DocReaderContext.tsx';

/** Opens help without navigating away from a form or changing dealership context. */
export function HelpButton({ topic = 'app/getting-started', inverted = false }: { topic?: string; inverted?: boolean }) {
  const { openHelp } = useDocReader();
  return (
    <button type="button" onClick={() => openHelp(topic)} aria-haspopup="dialog" data-help-topic={topic}
      className={`rounded-md px-3 py-1.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        inverted ? 'text-silver-100 hover:bg-navy-800 hover:text-white' : 'text-navy-800 hover:bg-silver-100'
      }`}>
      Help
    </button>
  );
}

export function HelpLink({ docId, children }: { docId: string; children: React.ReactNode }) {
  const { openDoc } = useDocReader();
  return <button type="button" onClick={() => openDoc(docId)} aria-haspopup="dialog"
    className="text-sm font-medium text-navy-700 underline underline-offset-2 hover:text-navy-900 focus-visible:outline focus-visible:outline-2">
    {children}
  </button>;
}
