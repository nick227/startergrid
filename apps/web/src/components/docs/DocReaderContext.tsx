import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type DocReaderContextValue = {
  docId: string | null;
  openDoc: (docId: string) => void;
  closeDoc: () => void;
};

const DocReaderContext = createContext<DocReaderContextValue | null>(null);

export function DocReaderProvider({ children }: { children: ReactNode }) {
  const [docId, setDocId] = useState<string | null>(null);

  const openDoc = useCallback((id: string) => setDocId(id), []);
  const closeDoc = useCallback(() => setDocId(null), []);

  const value = useMemo(
    () => ({ docId, openDoc, closeDoc }),
    [docId, openDoc, closeDoc]
  );

  return (
    <DocReaderContext.Provider value={value}>
      {children}
    </DocReaderContext.Provider>
  );
}

export function useDocReader(): DocReaderContextValue {
  const ctx = useContext(DocReaderContext);
  if (!ctx) throw new Error('useDocReader must be used within DocReaderProvider');
  return ctx;
}
