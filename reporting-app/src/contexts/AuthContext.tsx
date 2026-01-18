import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSettings } from './SettingsContext';

interface User {
  id: string;
  email: string;
  fullName: string;
  company: string | null;
  role: 'sysadmin' | 'user';
  accountNumber: number;
  language: 'en' | 'es';
  theme: 'light' | 'dark';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  csrfToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const { updateSettings } = useSettings();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const nextUser: User = {
          id: data.id,
          email: data.email,
          fullName: data.fullName || '',
          company: data.company || null,
          role: data.role,
          accountNumber: data.accountNumber,
          language: data.language || 'en',
          theme: data.theme || 'light',
        };
        setUser(nextUser);
        setCsrfToken(data.csrfToken || null);
        updateSettings({
          fullName: nextUser.fullName,
          email: nextUser.email,
          company: nextUser.company || '',
          language: nextUser.language,
          theme: nextUser.theme,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    const nextUser: User = {
      id: data.id,
      email: data.email,
      fullName: data.fullName || '',
      company: data.company || null,
      role: data.role,
      accountNumber: data.accountNumber,
      language: data.language || 'en',
      theme: data.theme || 'light',
    };
    setUser(nextUser);
    setCsrfToken(data.csrfToken || null);
    updateSettings({
      fullName: nextUser.fullName,
      email: nextUser.email,
      company: nextUser.company || '',
      language: nextUser.language,
      theme: nextUser.theme,
    });
  }

  async function logout() {
    const headers: HeadersInit = {};
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers,
      credentials: 'include',
    });
    setUser(null);
    setCsrfToken(null);
  }

  async function refreshMe() {
    await checkAuth();
  }

  return (
    <AuthContext.Provider value={{ user, loading, csrfToken, login, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
