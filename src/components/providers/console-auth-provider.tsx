'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';

const TOKEN_KEY = 'personal_token';

interface ConsoleAuthContextType {
  token: string | null;
  hasToken: boolean;
  setToken: (token: string) => void;
  clearToken: () => void;
}

const ConsoleAuthContext = createContext<ConsoleAuthContextType>({
  token: null,
  hasToken: false,
  setToken: () => {},
  clearToken: () => {},
});

export function useConsoleAuth() {
  return useContext(ConsoleAuthContext);
}

export function ConsoleAuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize token from localStorage on mount
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      setTokenState(storedToken);
      setIsLoading(false);
    }
  }, []);

  const setToken = useCallback(
    (newToken: string) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, newToken);
        setTokenState(newToken);
      }
    },
    [setTokenState],
  );

  const clearToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      setTokenState(null);
    }
  }, [setTokenState]);

  return (
    <ConsoleAuthContext.Provider
      value={{
        token,
        hasToken: !!token,
        setToken,
        clearToken,
      }}
    >
      {!isLoading && children}
    </ConsoleAuthContext.Provider>
  );
}

export function getPersonalAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function hasPersonalAccessToken(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(TOKEN_KEY);
}
