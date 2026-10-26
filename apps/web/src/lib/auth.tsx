'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchApi } from './api';

export interface User { id: string; name: string; email: string; phone?: string; role: string; }
interface AuthContextType {
  user: User | null; loading: boolean; sessionExpired: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>; refreshUser: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType>({ user: null, loading: true, sessionExpired: false, login: () => {}, logout: async () => {}, refreshUser: async () => {} });
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const refreshUser = async () => {
    try { setUser(await fetchApi<User>('/auth/me')); }
    catch { setUser(null); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    localStorage.removeItem('arise_token');
    localStorage.removeItem('arise_user');
    refreshUser();
  }, []);
  useEffect(() => {
    const expired = () => { if (user) { setSessionExpired(true); setUser(null); } };
    window.addEventListener('arise:session-expired', expired);
    return () => window.removeEventListener('arise:session-expired', expired);
  }, [user]);
  const login = (_token: string, userData: User) => { setSessionExpired(false); setUser(userData); };
  const logout = async () => {
    await fetchApi('/auth/logout', { method: 'POST' });
    setSessionExpired(false); setUser(null);
    window.location.assign('/login');
  };
  return <AuthContext.Provider value={{ user, loading, sessionExpired, login, logout, refreshUser }}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
