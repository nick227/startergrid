import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type DocReaderContextValue = {
  isOpen: boolean;
  docId: string | null;
  helpTopic: string | null;
  openHelp: (topic?: string) => void;
  openDoc: (docId: string) => void;
  closeDoc: () => void;
};

const DocReaderContext = createContext<DocReaderContextValue | null>(null);

export function DocReaderProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);
  const [helpTopic, setHelpTopic] = useState<string | null>(null);

  const openDoc = useCallback((id: string) => { setDocId(id); setIsOpen(true); }, []);
  const openHelp = useCallback((topic?: string) => {
    if (topic !== undefined) setHelpTopic(topic);
    setDocId(null); setIsOpen(true);
  }, []);
  const closeDoc = useCallback(() => { setDocId(null); setIsOpen(false); }, []);

  const value = useMemo(
    () => ({ isOpen, docId, helpTopic, openHelp, openDoc, closeDoc }),
    [isOpen, docId, helpTopic, openHelp, openDoc, closeDoc]
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
