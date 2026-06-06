import { useEffect } from 'react';
import { resetPageMeta, setPageMeta } from '../lib/pageMeta.ts';

export function usePageMeta(title: string, description?: string): void {
  useEffect(() => {
    setPageMeta(title, description);
    return () => resetPageMeta();
  }, [title, description]);
}
