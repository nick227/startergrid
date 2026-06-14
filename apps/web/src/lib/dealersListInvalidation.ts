import { useEffect } from 'react';

type ReloadFn = () => void;

const listeners = new Set<ReloadFn>();

export function invalidateDealersList(): void {
  for (const reload of listeners) reload();
}

export function useDealersListInvalidation(reload: ReloadFn): void {
  useEffect(() => {
    listeners.add(reload);
    return () => {
      listeners.delete(reload);
    };
  }, [reload]);
}
