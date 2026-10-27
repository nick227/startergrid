import { documentationUrl } from '@/lib/docs/urls.ts';

/** Documentation opens separately so unsaved work stays in the original tab. */
export function HelpButton({ topic = 'app/getting-started', inverted = false }: { topic?: string; inverted?: boolean }) {
  return (
    <a href={documentationUrl(topic)} target="_blank" rel="noopener noreferrer" aria-label="Help (opens in a new tab)"
      className={`rounded-md px-3 py-1.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${inverted ? 'text-silver-100 hover:bg-navy-800 hover:text-white' : 'text-navy-800 hover:bg-silver-100'}`}>
      Help
    </a>
  );
}

export function HelpLink({ docId, children }: { docId: string; children: React.ReactNode }) {
  return <a href={documentationUrl(docId)} target="_blank" rel="noopener noreferrer"
    className="text-sm font-medium text-navy-700 underline underline-offset-2 hover:text-navy-900 focus-visible:outline focus-visible:outline-2">
    {children}<span className="sr-only"> (opens in a new tab)</span>
  </a>;
}
