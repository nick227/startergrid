import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { MarketplaceUserIdentity } from '../lib/api.ts';
import type { BusinessCategoryId } from '@auto-dealer/category-schemas';
import {
  addFavorite,
  fetchFavorites,
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
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
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleFavorite: (listingId: string, category: BusinessCategoryId) => Promise<void>;
  isFavorited: (listingId: string) => boolean;
  syncFavorites: (category: BusinessCategoryId) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MarketplaceUserIdentity | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const syncFavorites = useCallback(async (category: BusinessCategoryId) => {
    if (!user) return;
    const resp = await fetchFavorites(category);
    setFavoriteIds(new Set(resp.favorites.map(v => v.listingId)));
  }, [user]);

  useEffect(() => {
    fetchMe()
      .then(identity => {
        setUser(identity);
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
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    const identity = await apiRegister(email, password, displayName);
    setUser(identity);
    setLoginModalOpen(false);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setFavoriteIds(new Set());
  }, []);

  const toggleFavorite = useCallback(async (
    listingId: string,
    category: BusinessCategoryId,
  ) => {
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
      else await addFavorite(listingId, category);
    } catch {
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
      login, register, logout, toggleFavorite, isFavorited, syncFavorites,
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
