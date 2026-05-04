'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/database';
import { login, register, logout, validateToken } from '../lib/auth';
import Cookies from 'js-cookie';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, fullName: string, status: 'personal' | 'corporate', linkedinUrl?: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
  updateUserData: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    // Sayfa yüklendiğinde token kontrolü yap
    const checkToken = async () => {
      if (!isMounted) return;
      
      // console.log('AuthContext - Token kontrolü başladı');
      setIsLoading(true);
      
      try {
        const token = Cookies.get('authToken') || localStorage.getItem('authToken');
        console.log('AuthContext - Token bulundu mu:', token ? 'Evet' : 'Hayır');
        
        if (token) {
          // console.log('AuthContext - Token doğrulanıyor...');
          const user = await validateToken(token);
          // console.log('AuthContext - Token doğrulama sonucu:', user);
          
          if (isMounted) {
            if (user) {
              // console.log('AuthContext - Kullanıcı bilgisi yüklendi:', user);
              setUser(user);
              // Token'ı cookie'ye de kaydet
              Cookies.set('authToken', token, { expires: 7 }); // 7 günlük
            } else {
              // console.log('AuthContext - Token geçersiz, temizleniyor');
              // Token geçersizse temizle
              localStorage.removeItem('authToken');
              Cookies.remove('authToken');
              setUser(null);
            }
          }
        } else {
          console.log('AuthContext - Token bulunamadı');
          if (isMounted) {
            setUser(null);
          }
        }
      } catch (error) {
        console.error('AuthContext - Token kontrolü sırasında hata:', error);
        if (isMounted) {
          setError('Token kontrolü sırasında bir hata oluştu');
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };
    
    checkToken();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    
    try {
      const result = await login(email, password);
      
      if (result) {
        setUser(result.user);
        // Token'ı hem localStorage'a hem de cookie'ye kaydet
        localStorage.setItem('authToken', result.token);
        Cookies.set('authToken', result.token, { expires: 7 }); // 7 günlük
        setIsLoading(false);
        return true;
      } else {
        setError('Invalid email or password');
        setIsLoading(false);
        return false;
      }
    } catch {
      setError('An error occurred during login');
      setIsLoading(false);
      return false;
    }
  };

  const handleRegister = async (email: string, password: string, fullName: string, status: 'personal' | 'corporate' = 'personal', linkedinUrl?: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    
    try {
      const user = await register(email, password, fullName, status, linkedinUrl);
      
      if (user) {
        // Kayıt başarılı, otomatik login olma
        const loginResult = await login(email, password);
        
        if (loginResult) {
          setUser(loginResult.user);
          localStorage.setItem('authToken', loginResult.token);
          Cookies.set('authToken', loginResult.token, { expires: 7 }); // 7 günlük
          setIsLoading(false);
          return true;
        }
      }
      
      setError('Registration failed');
      setIsLoading(false);
      return false;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred during registration');
      }
      setIsLoading(false);
      return false;
    }
  };

  const handleLogout = async (): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const token = Cookies.get('authToken') || localStorage.getItem('authToken');
      
      if (token) {
        const success = await logout(token);
        
        if (success) {
          localStorage.removeItem('authToken');
          Cookies.remove('authToken');
          setUser(null);
          setIsLoading(false);
          return true;
        }
      }
      
      setError('Logout failed');
      setIsLoading(false);
      return false;
    } catch {
      setError('An error occurred during logout');
      setIsLoading(false);
      return false;
    }
  };

  const updateUserData = (userData: User) => {
    setUser(userData);
  };

  const value = {
    user,
    isLoading: isLoading || !isInitialized, // isInitialized false ise hala yükleniyor sayılır
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    updateUserData
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
} 