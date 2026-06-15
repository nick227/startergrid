import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { readRecentListings, subscribeRecentListings, type RecentListing } from '../features/listings/recentlyViewed.ts';

type PersonalizationContextValue = {
  recentListings: RecentListing[];
};

const PersonalizationContext = createContext<PersonalizationContextValue | null>(null);

function getSnapshot() {
  return readRecentListings();
}

function getServerSnapshot() {
  return [];
}

export function PersonalizationProvider({ children }: { children: ReactNode }) {
  const recentListings = useSyncExternalStore(subscribeRecentListings, getSnapshot, getServerSnapshot);

  return (
    <PersonalizationContext.Provider value={{ recentListings }}>
      {children}
    </PersonalizationContext.Provider>
  );
}

export function usePersonalization(): PersonalizationContextValue {
  const context = useContext(PersonalizationContext);
  if (!context) {
    throw new Error('usePersonalization must be used within a PersonalizationProvider');
  }
  return context;
}
