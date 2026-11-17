import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  type AccountStatus,
  AUTH_ROUTE_PATHS,
  type AuthUser,
} from '../types/auth';
import {
  fetchCurrentSession,
  logoutSession,
} from '../services/authService';

export interface AccountNoticeContext {
  status: AccountStatus;
  email?: string;
  fullName?: string;
  requestedRole?: string;
  reason?: string | null;
  message?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  pathname: string;
  search: string;
  accountNotice: AccountNoticeContext | null;
  setAccountNotice: (notice: AccountNoticeContext | null) => void;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  refreshSession: () => Promise<AuthUser | null>;
  setAuthenticatedUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
  isAuthRoute: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizePathname(raw: string): string {
  if (!raw || raw === '/') return '/';
  const clean = raw.replace(/\/+$/, '');
  return clean || '/';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pathname, setPathname] = useState<string>(() =>
    normalizePathname(window.location.pathname),
  );
  const [search, setSearch] = useState<string>(() => window.location.search);
  const [accountNotice, setAccountNotice] = useState<AccountNoticeContext | null>(null);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const url = new URL(to, window.location.origin);
    const nextPath = normalizePathname(url.pathname);
    const fullTarget = `${nextPath}${url.search}`;
    if (options?.replace) {
      window.history.replaceState({}, '', fullTarget);
    } else {
      window.history.pushState({}, '', fullTarget);
    }
    setPathname(nextPath);
    setSearch(url.search);
  }, []);

  const refreshSession = useCallback(async (): Promise<AuthUser | null> => {
    const res = await fetchCurrentSession();
    const resolved = res.authenticated && res.user ? res.user : null;
    setUser(resolved);
    return resolved;
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const nextPath = normalizePathname(window.location.pathname);
      setPathname(nextPath);
      setSearch(window.location.search);
      // Re-validate session on browser history navigation so logged-out users
      // cannot step back into cached protected screens.
      void refreshSession();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void refreshSession();
      }
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [refreshSession]);

  useEffect(() => {
    let mounted = true;
    fetchCurrentSession()
      .then((sessionRes) => {
        if (!mounted) return;
        setUser(sessionRes.authenticated && sessionRes.user ? sessionRes.user : null);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Periodic session validation (handles admin suspension / session expiry gracefully)
  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(async () => {
      const res = await fetchCurrentSession();
      if (!res.authenticated || !res.user) {
        setUser(null);
        setAccountNotice({
          status: 'suspended',
          message: 'Your session expired or was revoked. Please sign in again.',
        });
        navigate('/login', { replace: true });
      } else {
        setUser(res.user);
      }
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [user, navigate]);

  const setAuthenticatedUser = useCallback((nextUser: AuthUser | null) => {
    setUser(nextUser);
    if (nextUser) {
      setAccountNotice(null);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutSession();
    } finally {
      setUser(null);
      setAccountNotice(null);
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const isAuthRoute = AUTH_ROUTE_PATHS.includes(pathname as (typeof AUTH_ROUTE_PATHS)[number]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        pathname,
        search,
        accountNotice,
        setAccountNotice,
        navigate,
        refreshSession,
        setAuthenticatedUser,
        logout,
        isAuthRoute,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
