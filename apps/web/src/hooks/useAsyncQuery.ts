import { useState, useEffect, useCallback, useRef } from 'react';
import { toErrorMessage } from '@/lib/errors.ts';

export type AsyncQueryState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  reload: () => void;
};

export function useAsyncQuery<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[]
): AsyncQueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    loaderRef
      .current()
      .then(d => {
        setData(d);
        setLoading(false);
        setLastRefresh(new Date());
      })
      .catch(e => {
        setError(toErrorMessage(e));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller-owned dependency list
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, lastRefresh, reload };
}
