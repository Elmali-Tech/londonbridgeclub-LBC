'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@/types/database';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    email: string,
    password: string,
    fullName: string,
    status: 'personal' | 'corporate',
    linkedinUrl?: string,
  ) => Promise<boolean>;
  logout: () => Promise<boolean>;
  updateUserData: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
// Compatibility marker for older UI code that still checks this key before a
// same-origin fetch. It is deliberately not a credential; the real token is
// only stored in the HttpOnly cookie and validated on the server.
const LEGACY_SESSION_MARKER = 'http-only-session';

interface AuthProviderProps {
  children: ReactNode;
}

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    return typeof body?.error === 'string' ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      setIsLoading(true);
      // Tokens are now kept in an HttpOnly cookie. Remove the legacy JS copy.
      localStorage.removeItem('authToken');

      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
        });

        if (!isMounted) return;

        if (response.ok) {
          const body = await response.json();
          setUser(body.user ?? null);
          localStorage.setItem('authToken', LEGACY_SESSION_MARKER);
        } else {
          localStorage.removeItem('authToken');
          setUser(null);
        }
      } catch (sessionError) {
        console.error('AuthContext session check failed:', sessionError);
        if (isMounted) {
          setError('Unable to verify your session');
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    void loadSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    localStorage.removeItem('authToken');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError(await getErrorMessage(response, 'Invalid email or password'));
        setUser(null);
        return false;
      }

      const body = await response.json();
      setUser(body.user ?? null);
      localStorage.setItem('authToken', LEGACY_SESSION_MARKER);
      return !!body.user;
    } catch (loginError) {
      console.error('AuthContext login failed:', loginError);
      setError('An error occurred during login');
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (
    email: string,
    password: string,
    fullName: string,
    status: 'personal' | 'corporate' = 'personal',
    linkedinUrl?: string,
  ): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password, fullName, status, linkedinUrl }),
      });

      if (!response.ok) {
        setError(await getErrorMessage(response, 'Registration failed'));
        return false;
      }

      return await handleLogin(email, password);
    } catch (registrationError) {
      console.error('AuthContext registration failed:', registrationError);
      setError('An error occurred during registration');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async (): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        setError('Logout failed');
        return false;
      }

      setUser(null);
      return true;
    } catch (logoutError) {
      console.error('AuthContext logout failed:', logoutError);
      setError('An error occurred during logout');
      return false;
    } finally {
      localStorage.removeItem('authToken');
      setIsLoading(false);
    }
  };

  const updateUserData = (userData: User) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isLoading || !isInitialized,
        error,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        updateUserData,
      }}
    >
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
