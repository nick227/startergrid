import { getDoc } from './registry.ts';

/** Hash routes preserve the existing app hosting contract and work on a fresh load. */
export function documentationUrl(id?: string): string {
  return id ? `#/docs/${encodeURIComponent(getDoc(id)?.id ?? id)}` : '#/docs';
}

export function openDocumentation(id?: string): void {
  window.open(documentationUrl(id), '_blank', 'noopener,noreferrer');
}
