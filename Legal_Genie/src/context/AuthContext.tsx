import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@/types';
import { authService } from '@/services';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    name: string,
    email: string,
    organisation: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
  updateProfile: (profile: Pick<User, 'name' | 'email' | 'organisation'>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authService.hasSession()) { setLoading(false); return; }
    authService.profile().then(setUser).catch(() => authService.logout()).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await authService.login(email, password);
    setUser(u);
  }, []);

  const signup = useCallback(
    async (name: string, email: string, organisation: string, password: string) => {
      const u = await authService.signup(name, email, organisation, password);
      setUser(u);
    },
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
    authService.logout();
  }, []);

  const updateProfile = useCallback(async (profile: Pick<User, 'name' | 'email' | 'organisation'>) => {
    setUser(await authService.updateProfile(profile));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
