import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getMe, checkCookie, logoutUser } from './api';
import type { Trip } from '@/types';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
  plan: string;
  travel_memory: string;
  created_at: string;
  last_login: string;
}

interface AuthResponse {
  authenticated: boolean;
  user?: User;
}

interface CheckCookieResponse {
  data: AuthResponse;
}

interface GetMeResponse {
  data: User;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  saveAuth: (token: string, userData: User) => void;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<User | null>;
  travelMemory: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const syncMemory = useCallback((userData: User) => {
    if (userData?.travel_memory) {
      localStorage.setItem('atlas_memory', userData.travel_memory);
    }
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('atlas_token');
    localStorage.removeItem('atlas_user');
    localStorage.removeItem('atlas_memory');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const r = await getMe();
      setUser(r.data);
      localStorage.setItem('atlas_user', JSON.stringify(r.data));
      syncMemory(r.data);
      return r.data;
    } catch {
      clearAuth();
      return null;
    }
  }, [syncMemory, clearAuth]);

  useEffect(() => {
    const saved = localStorage.getItem('atlas_user');
    const token = localStorage.getItem('atlas_token');

    checkCookie().then((r: CheckCookieResponse) => {
      if (r.data?.authenticated) {
        setUser(r.data.user!);
        localStorage.setItem('atlas_user', JSON.stringify(r.data.user));
        syncMemory(r.data.user!);
        setLoading(false);
        return;
      }
      if (saved && token) {
        setUser(JSON.parse(saved));
        refreshUser().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch(() => {
      if (saved && token) {
        setUser(JSON.parse(saved));
        refreshUser().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, [refreshUser, syncMemory]);

  const saveAuth = (token: string, userData: User) => {
    localStorage.setItem('atlas_token', token);
    localStorage.setItem('atlas_user', JSON.stringify(userData));
    syncMemory(userData);
    setUser(userData);
  };

  const logout = async () => {
    try { await logoutUser(); } catch {}
    clearAuth();
  };

  const [travelMemory, setTravelMemory] = useState('');

  useEffect(() => {
    if (user?.travel_memory) {
      setTravelMemory(user.travel_memory);
    } else if (typeof window !== 'undefined') {
      setTravelMemory(localStorage.getItem('atlas_memory') || '');
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, saveAuth, logout, setUser, refreshUser, travelMemory }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};