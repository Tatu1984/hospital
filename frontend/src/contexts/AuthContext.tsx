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
    // Re-hydrate session from storage. Access token may live in sessionStorage
    // (cleared on tab close) or fall back to localStorage; refresh token is
    // always in localStorage so a refresh can recover the session on reload.
    const storedToken = tokenStore.getAccess();
    const storedUser = localStorage.getItem('user');
    const storedPermissions = localStorage.getItem('permissions');

    if (storedToken && storedUser) {
      setToken(storedToken);
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setPermissions(storedPermissions ? JSON.parse(storedPermissions) : parsedUser.permissions || []);

      // Validate the token in the background. If /api/auth/me succeeds we
      // also refresh the cached user/permissions so the UI follows backend
      // role changes without requiring a re-login. Failures are silent — the
      // axios 401 interceptor will handle expiry by refreshing or logging out.
      authAPI.me()
        .then((res) => {
          const fresh = res.data;
          setUser(fresh);
          setPermissions(fresh.permissions || []);
          localStorage.setItem('user', JSON.stringify(fresh));
          localStorage.setItem('permissions', JSON.stringify(fresh.permissions || []));
        })
        .catch(() => undefined);
    }
    setLoading(false);
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
