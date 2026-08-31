import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthResponse } from '../types/auth';
import type { RiderProfile } from '../types/rider';

const TOKEN_KEY = 'nexor_rider_token';
const RIDER_KEY = 'nexor_rider_data';

interface AuthContextValue {
  token: string | null;
  rider: RiderProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (authResponse: AuthResponse) => void;
  logout: () => void;
  updateRider: (rider: RiderProfile) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [rider, setRider] = useState<RiderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedRider = localStorage.getItem(RIDER_KEY);
    if (storedToken && storedRider) {
      try {
        setToken(storedToken);
        setRider(JSON.parse(storedRider));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(RIDER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((authResponse: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, authResponse.accessToken);
    localStorage.setItem(RIDER_KEY, JSON.stringify(authResponse.rider));
    setToken(authResponse.accessToken);
    setRider(authResponse.rider);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(RIDER_KEY);
    setToken(null);
    setRider(null);
  }, []);

  const updateRider = useCallback((updated: RiderProfile) => {
    localStorage.setItem(RIDER_KEY, JSON.stringify(updated));
    setRider(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        rider,
        isAuthenticated: !!token && !!rider,
        isLoading,
        login,
        logout,
        updateRider,
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
