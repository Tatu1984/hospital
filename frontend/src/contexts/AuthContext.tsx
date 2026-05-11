import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, tokenStore } from '../services/api';
import { canAccessRoute, getAccessibleRoutes } from '../config/permissions';

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  roleIds: string[];
  permissions?: string[];  // Backend permissions
  tenant: any;
  branch: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  hasAccess: (route: string) => boolean;
  hasPermission: (permission: string) => boolean;
  accessibleRoutes: string[];
  permissions: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    // Re-hydrate session. The access token is memory-only and is therefore
    // gone after a hard reload; the refresh cookie is httpOnly and JS can't
    // read it. So on every fresh page load we attempt /auth/refresh — on
    // success the backend hands back a new access token AND we re-fetch the
    // canonical user via /auth/me. On failure the user simply lands logged out.
    //
    // user/permissions cached in localStorage are non-sensitive UI hints (role
    // labels, sidebar entries) used to render the shell before the network
    // round-trip lands. They don't grant access — the backend re-checks every
    // permission per request.
    let cancelled = false;
    (async () => {
      try {
        const refresh = await authAPI.refresh();
        const newToken = refresh.data?.token;
        if (!newToken) {
          setLoading(false);
          return;
        }
        if (cancelled) return;
        tokenStore.set(newToken);
        setToken(newToken);

        const me = await authAPI.me();
        if (cancelled) return;
        const fresh = me.data;
        setUser(fresh);
        setPermissions(fresh.permissions || []);
        localStorage.setItem('user', JSON.stringify(fresh));
        localStorage.setItem('permissions', JSON.stringify(fresh.permissions || []));
        void import('../lib/letterheadStore').then((m) => m.loadLetterhead());
      } catch {
        // No valid refresh cookie — leave the user logged out and let the
        // route guards send them to /login on protected pages.
        tokenStore.clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (username: string, password: string) => {
    const response = await authAPI.login(username, password);
    // Refresh token is set as an httpOnly cookie by the backend; we don't
    // store it in JS anymore (XSS-safe). Just keep the access token in memory.
    const { token, user } = response.data;

    setToken(token);
    setUser(user);
    setPermissions(user.permissions || []);
    tokenStore.set(token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('permissions', JSON.stringify(user.permissions || []));
    // Pre-fetch the tenant letterhead so the first PDF generated this
    // session has the right background.
    void import('../lib/letterheadStore').then((m) => m.loadLetterhead());
  };

  const logout = useCallback(() => {
    // Best-effort server notification (stateless logout, but useful for audit).
    authAPI.logout().catch(() => undefined);
    setUser(null);
    setToken(null);
    setPermissions([]);
    tokenStore.clear();
  }, []);

  // Check if user can access a route (based on role-route mapping)
  const hasAccess = useCallback((route: string): boolean => {
    if (!user) return false;
    return canAccessRoute(user.roleIds, route);
  }, [user]);

  // Check if user has a specific backend permission
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;

    // Admin has all permissions
    if (user.roleIds.includes('ADMIN')) return true;

    // Check user's permissions array from backend
    return permissions.includes(permission);
  }, [user, permissions]);

  const accessibleRoutes = user ? getAccessibleRoutes(user.roleIds) : [];

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      loading,
      hasAccess,
      hasPermission,
      accessibleRoutes,
      permissions,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
