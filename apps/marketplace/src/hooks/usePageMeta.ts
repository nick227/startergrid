import { useEffect } from 'react';
import { setPageMeta } from '../lib/pageMeta.ts';

export function usePageMeta(title: string, description?: string): void {
  useEffect(() => {
    setPageMeta(title, description);
  }, [title, description]);
}
