import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { isMfaChallenge, type AuthSession, type MfaChallenge, type User } from '../types';
import {
  clearSession,
  isSessionExpired,
  loadSession,
  saveSession,
} from '../services/auth/authStorage';
import EncryptedStorage from 'react-native-encrypted-storage';
import { api, onUnauthorized, setActiveSchoolId } from '../services/api';

const ADMIN_ROLES = ['school_admin', 'district_admin', 'platform_super_admin'];
const DASHBOARD_ROLES = [...ADMIN_ROLES, 'staff'];
const activeSchoolKey = (userId: string) => `sdp.activeSchool.${userId}`;

interface AuthContextValue {
  user: User | null;
  token: string | null;
  /** True while the persisted session is being restored on app launch. */
  isRestoring: boolean;
  isAuthenticating: boolean;
  /**
   * Password step. Resolves null once signed in, or with the challenge
   * when a two-step verification code (or setup) is still needed — the
   * screen completes that and then calls adoptSession.
   */
  login: (identifier: string, password: string) => Promise<MfaChallenge | null>;
  adoptSession: (session: AuthSession) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * False for front desk / office staff: they share the admin console
   * but the backend only lets them read, so screens hide the add/
   * suspend/delete controls and the admin-only sections. A session
   * saved before memberships were part of it counts as true — the
   * backend still enforces the real rule either way.
   */
  canManageSchool: boolean;
  /** Schools this admin user can work in (more than one for a district admin). */
  schools: { schoolId: string; schoolName: string }[];
  /** The school the admin screens show and act on (null for single-school users). */
  activeSchoolId: string | null;
  setActiveSchool: (schoolId: string) => void;
  isDistrictAdmin: boolean;
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
      const result = await api.login(identifier, password);
      if (isMfaChallenge(result)) return result;
      await saveSession(result);
      setSession(result);
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setSession(null);
  }, []);
  const adoptSession = useCallback(async (newSession: AuthSession) => {
    await saveSession(newSession);
    setSession(newSession);
  }, []);

  // A 401 from any API call means the server has stopped honoring this
  // token — drop the local session so the login screen comes back up,
  // instead of leaving stale screens quietly showing empty state.
  useEffect(() => {
    onUnauthorized(() => {
      clearSession();
      setSession(null);
    });
  }, []);

  // Admin schools, de-duplicated (someone can be both a school admin
  // and a district admin of the same school).
  const memberships = session?.user.memberships;
  const schools = useMemo(() => {
    if (session?.user.role !== 'admin' || !memberships) return [];
    const byId = new Map<string, string>();
    for (const m of memberships) if (DASHBOARD_ROLES.includes(m.role) && !byId.has(m.schoolId)) byId.set(m.schoolId, m.schoolName ?? m.schoolId);
    return [...byId].map(([schoolId, schoolName]) => ({ schoolId, schoolName }));
  }, [session?.user.role, memberships]);

  const [chosenSchoolId, setChosenSchoolId] = useState<string | null>(null);
  const userId = session?.user.id;
  useEffect(() => {
    setChosenSchoolId(null);
    if (!userId) return;
    EncryptedStorage.getItem(activeSchoolKey(userId)).then(saved => setChosenSchoolId(saved ?? null)).catch(() => {});
  }, [userId]);
  const activeSchoolId = schools.length > 1
    ? (schools.some(s => s.schoolId === chosenSchoolId) ? chosenSchoolId : schools[0].schoolId)
    : null;
  // Set synchronously during render so the first requests already carry it.
  setActiveSchoolId(activeSchoolId);

  const setActiveSchool = useCallback((schoolId: string) => {
    if (userId) EncryptedStorage.setItem(activeSchoolKey(userId), schoolId).catch(() => {});
    setChosenSchoolId(schoolId);
  }, [userId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isRestoring,
      isAuthenticating,
      login,
      adoptSession,
      logout,
      canManageSchool: !memberships
        || memberships.some(m => ADMIN_ROLES.includes(m.role) && (!activeSchoolId || m.schoolId === activeSchoolId)),
      schools,
      activeSchoolId,
      setActiveSchool,
      isDistrictAdmin: Boolean(memberships?.some(m => m.role === 'district_admin')),
    }),
    [session, memberships, isRestoring, isAuthenticating, login, adoptSession, logout, schools, activeSchoolId, setActiveSchool],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
