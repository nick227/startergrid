import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { MarketplaceUserIdentity } from '../lib/api.ts';
import {
  addFavorite,
  fetchFavorites,
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  removeFavorite,
} from '../lib/api.ts';

type AuthState = {
  user: MarketplaceUserIdentity | null;
  authReady: boolean;
  favoriteIds: Set<string>;
  loginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleFavorite: (listingId: string) => Promise<void>;
  isFavorited: (listingId: string) => boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MarketplaceUserIdentity | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    fetchMe()
      .then(identity => {
        setUser(identity);
        return fetchFavorites();
      })
      .then(resp => {
        setFavoriteIds(new Set(resp.favorites.map(v => v.listingId)));
      })
      .catch(() => {
        // 401 = unauthenticated — expected on first load
      })
      .finally(() => {
        setAuthReady(true);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const identity = await apiLogin(email, password);
    setUser(identity);
    setLoginModalOpen(false);
    try {
      const resp = await fetchFavorites();
      setFavoriteIds(new Set(resp.favorites.map(v => v.listingId)));
    } catch {
      // Non-critical; favorites will load on next visit
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setFavoriteIds(new Set());
  }, []);

  const toggleFavorite = useCallback(async (listingId: string) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    const wasFavorited = favoriteIds.has(listingId);
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (wasFavorited) next.delete(listingId);
      else next.add(listingId);
      return next;
    });
    try {
      if (wasFavorited) await removeFavorite(listingId);
      else await addFavorite(listingId);
    } catch {
      // Revert optimistic update on failure
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (wasFavorited) next.add(listingId);
        else next.delete(listingId);
        return next;
      });
    }
  }, [user, favoriteIds]);

  const isFavorited = useCallback(
    (listingId: string) => favoriteIds.has(listingId),
    [favoriteIds],
  );

  return (
    <AuthContext.Provider value={{
      user, authReady, favoriteIds,
      loginModalOpen,
      openLoginModal: () => setLoginModalOpen(true),
      closeLoginModal: () => setLoginModalOpen(false),
      login, logout, toggleFavorite, isFavorited,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
