import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
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
    // Load user from localStorage on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedPermissions = localStorage.getItem('permissions');

    if (storedToken && storedUser) {
      setToken(storedToken);
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setPermissions(storedPermissions ? JSON.parse(storedPermissions) : parsedUser.permissions || []);
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authAPI.login(username, password);
      const { token, user } = response.data;

      setToken(token);
      setUser(user);
      setPermissions(user.permissions || []);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('permissions', JSON.stringify(user.permissions || []));
    } catch (error) {
      throw error;
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setPermissions([]);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
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
