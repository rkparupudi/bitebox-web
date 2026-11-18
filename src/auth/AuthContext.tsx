import { useQueryClient } from '@tanstack/react-query';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore, UNAUTHORIZED_EVENT } from '../api/client';
import type { User } from '../api/types';
import { disconnectSocket } from '../lib/realtime';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (b: Parameters<typeof api.register>[0]) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    tokenStore.clear();
    disconnectSocket();
    setUser(null);
    queryClient.clear(); // never show one user's cached data to the next
  }, [queryClient]);

  // On load, turn a stored token back into a user (or drop it if it has expired).
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      logout,
      login: async (email, password) => {
        const res = await api.login(email, password);
        tokenStore.set(res.accessToken);
        queryClient.clear();
        setUser(res.user);
        return res.user;
      },
      register: async (b) => {
        const res = await api.register(b);
        tokenStore.set(res.accessToken);
        queryClient.clear();
        setUser(res.user);
        return res.user;
      },
    }),
    [user, loading, logout, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Where each role lands after signing in. */
export const homeFor = (role: User['role']) =>
  role === 'admin' ? '/admin' : role === 'restaurant_owner' ? '/dashboard' : '/';
