import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchOperatorMe,
  loginOperator,
  logoutOperator,
  subscribeUnauthorized,
  type OperatorUser,
} from '@/lib/api/auth.ts';
import { devBypassIdentity } from '@/lib/devAuth.ts';

type AuthState = {
  user: OperatorUser | null;
  authReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<OperatorUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const logout = useCallback(async () => {
    await logoutOperator();
    setUser(devBypassIdentity());
    window.location.hash = '#/';
  }, []);

  useEffect(() => {
    fetchOperatorMe()
      .then(setUser)
      .catch(() => {
        setUser(devBypassIdentity());
      })
      .finally(() => setAuthReady(true));
  }, []);

  useEffect(() => subscribeUnauthorized(() => {
    const dev = devBypassIdentity();
    setUser(dev);
    if (!dev) window.location.hash = '#/';
  }), []);

  const login = useCallback(async (email: string, password: string) => {
    const identity = await loginOperator(email, password);
    setUser(identity);
  }, []);

  return (
    <AuthContext.Provider value={{ user, authReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
