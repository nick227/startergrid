import { useState, useEffect, useCallback } from 'react';

export type QueryState<T> = {
  data:    T | null;
  loading: boolean;
  error:   unknown;
  reload:  () => void;
};

export function queryErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export function useQuery<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[],
  options: { enabled?: boolean } = {},
): QueryState<T> {
  const enabled = options.enabled ?? true;
  const [data,    setData]    = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error,   setError]   = useState<unknown>(null);
  const [tick,    setTick]    = useState(0);

  const reload = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      setData(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    loader()
      .then(d  => { if (active) { setData(d);  setLoading(false); } })
      .catch(e => { if (active) { setError(e); setLoading(false); } });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);

  return { data, loading, error, reload };
}
