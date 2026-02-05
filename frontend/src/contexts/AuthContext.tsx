'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type User = {
  id: string;
  email: string;
  full_name?: string;
  organizations?: { organization_id: string; role_name: string }[];
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  organizationId: string | null;
  setOrganizationId: (id: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  loadUser: () => Promise<void>;
  isReady: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [organizationId, setOrganizationIdState] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const setOrganizationId = (id: string | null) => {
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('organizationId', id);
      else localStorage.removeItem('organizationId');
    }
    setOrganizationIdState(id);
  };

  const loadUser = async () => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!t) {
      setUser(null);
      setToken(null);
      setIsReady(true);
      return;
    }
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) {
        localStorage.removeItem('token');
        localStorage.removeItem('organizationId');
        setUser(null);
        setToken(null);
        setIsReady(true);
        return;
      }
      const data = await res.json();
      setUser(data);
      setToken(t);
      const orgId = typeof window !== 'undefined' ? localStorage.getItem('organizationId') : null;
      if (orgId && data.organizations?.some((o: { organization_id: string }) => o.organization_id === orgId)) {
        setOrganizationIdState(orgId);
      } else if (data.organizations?.length) {
        setOrganizationIdState(data.organizations[0].organization_id);
        if (typeof window !== 'undefined') localStorage.setItem('organizationId', data.organizations[0].organization_id);
      } else {
        setOrganizationIdState(null);
      }
    } catch {
      setUser(null);
      setToken(null);
      setOrganizationIdState(null);
    } finally {
      setIsReady(true);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = (u: User, t: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', t);
      const orgId = u.organizations?.[0]?.organization_id;
      if (orgId) {
        localStorage.setItem('organizationId', orgId);
        setOrganizationIdState(orgId);
      }
    }
    setUser(u);
    setToken(t);
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('organizationId');
    }
    setUser(null);
    setToken(null);
    setOrganizationIdState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        organizationId,
        setOrganizationId,
        login,
        logout,
        loadUser,
        isReady,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
