import { createContext, useContext, type ReactNode } from 'react';
import { openDocumentation } from '@/lib/docs/urls.ts';

const actions = { openHelp: openDocumentation, openDoc: openDocumentation };
const DocReaderContext = createContext(actions);
export function DocReaderProvider({ children }: { children: ReactNode }) {
  return <DocReaderContext.Provider value={actions}>{children}</DocReaderContext.Provider>;
}
export function useDocReader() { return useContext(DocReaderContext); }
