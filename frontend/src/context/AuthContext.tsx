import React, { createContext, useContext, useState, useEffect } from 'react';
import { CurrentUser } from '@/types';
import { api, setAuthToken } from '@/lib/api';
import { clearCachedData } from '@/lib/idb';

interface AuthContextType {
  user: CurrentUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setPasswordChanged: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await api<{ authenticated: boolean; user?: any; token?: string }>('GET', '/auth/me');
      if (res.authenticated && res.user) {
        if (res.token) {
          setAuthToken(res.token);
        }
        setUser({
          id: res.user.id,
          username: res.user.username,
          fullName: res.user.fullName || res.user.full_name,
          role: res.user.role,
          householdId: res.user.householdId || res.user.household_id,
          householdName: res.user.householdName || res.user.household_name || 'Household',
          mustChangePassword: !!res.user.mustChangePassword,
          authenticated: true,
        });
      } else {
        setAuthToken(null);
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api<{ success: boolean; user: any }>('POST', '/auth/login', {
      username,
      password,
    });
    if (res.user) {
      setUser({
        id: res.user.id,
        username: res.user.username,
        fullName: res.user.fullName || res.user.full_name,
        role: res.user.role,
        householdId: res.user.householdId || res.user.household_id,
        householdName: res.user.householdName || res.user.household_name || 'Household',
        mustChangePassword: !!res.user.mustChangePassword,
        authenticated: true,
      });
    }
  };

  const logout = async () => {
    try {
      await api('POST', '/auth/logout');
    } finally {
      setAuthToken(null);
      setUser(null);
      void clearCachedData(true);
    }
  };

  const setPasswordChanged = () => {
    if (user) {
      setUser({ ...user, mustChangePassword: false });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser: fetchCurrentUser,
        setPasswordChanged,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
