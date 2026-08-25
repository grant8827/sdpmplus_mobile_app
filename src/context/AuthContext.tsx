import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { AuthSession, User } from '../types';
import {
  clearSession,
  isSessionExpired,
  loadSession,
  saveSession,
} from '../services/auth/authStorage';
import { mockLogin } from '../services/auth/mockAuthApi';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  /** True while the persisted session is being restored on app launch. */
  isRestoring: boolean;
  isAuthenticating: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // SDP-1 AC: "Role switcher / session management handles token refresh
  // and session expiration." Restoring + expiry checks happen here;
  // wire an actual refresh-token call in once the backend exists.
  useEffect(() => {
    (async () => {
      try {
        const stored = await loadSession();
        if (stored && !isSessionExpired(stored)) {
          setSession(stored);
        } else if (stored) {
          await clearSession();
        }
      } finally {
        setIsRestoring(false);
      }
    })();
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    setIsAuthenticating(true);
    try {
      const newSession = await mockLogin(identifier, password);
      await saveSession(newSession);
      setSession(newSession);
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isRestoring,
      isAuthenticating,
      login,
      logout,
    }),
    [session, isRestoring, isAuthenticating, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
