import { useState, useEffect, useCallback } from 'react';
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
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loader()
      .then(d => {
        if (!active) return;
        setData(d);
        setLoading(false);
        setLastRefresh(new Date());
      })
      .catch(e => {
        if (!active) return;
        setError(toErrorMessage(e));
        setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller-owned dependency list
  }, [...deps, tick]);

  return { data, loading, error, lastRefresh, reload };
}
