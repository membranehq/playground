'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { createAuth0Client, Auth0Client } from '@auth0/auth0-spa-js';

import { ENV_CONFIG } from '@/config/env';

const JWT_TOKEN_KEY = 'jwt';
const PAT_TOKEN_KEY = 'personal_token';
const REDIRECT_AFTER_LOGIN_PATH_KEY = 'redirectAfterLoginPath';

export type AuthMode = 'auth0' | 'pat';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authMode: AuthMode;
  login: (returnTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  // PAT-specific methods
  setPatToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isAuthenticated: false,
  isLoading: true,
  authMode: 'pat',
  login: async () => {},
  logout: async () => {},
  setPatToken: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

let handlingLoginCallback = false;
let auth0ClientPromise: Promise<Auth0Client> | null = null;

function isAuth0Enabled(): boolean {
  const domain = ENV_CONFIG.AUTH0_DOMAIN;
  const clientId = ENV_CONFIG.AUTH0_CLIENT_ID;
  return !!(domain && clientId);
}

function getAuthMode(): AuthMode {
  return isAuth0Enabled() ? 'auth0' : 'pat';
}

async function getAuthClient(): Promise<Auth0Client> {
  if (auth0ClientPromise) {
    return auth0ClientPromise;
  }

  const domain = ENV_CONFIG.AUTH0_DOMAIN;
  const clientId = ENV_CONFIG.AUTH0_CLIENT_ID;

  if (!domain || !clientId) {
    throw new Error('Auth0 is not configured');
  }

  auth0ClientPromise = createAuth0Client({
    domain,
    clientId,
    useRefreshTokens: true,
  });

  return auth0ClientPromise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHandlingCallback, setIsHandlingCallback] = useState(false);
  const [authMode] = useState<AuthMode>(getAuthMode);

  // Initialize token from localStorage on mount based on auth mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tokenKey = authMode === 'auth0' ? JWT_TOKEN_KEY : PAT_TOKEN_KEY;
      const storedToken = localStorage.getItem(tokenKey);
      setTokenState(storedToken);
      setIsLoading(false);
    }
  }, [authMode]);

  // Periodically refresh Auth0 token so it does not expire (only for Auth0 mode)
  useEffect(() => {
    if (authMode !== 'auth0' || !token) {
      return;
    }

    const refreshToken = async () => {
      try {
        const client = await getAuthClient();
        await client.getTokenSilently();
        const claims = await client.getIdTokenClaims();
        if (claims) {
          localStorage.setItem(JWT_TOKEN_KEY, claims.__raw);
          setTokenState(claims.__raw);
        }
      } catch (error) {
        console.error('Failed to refresh token:', error);
      }
    };

    // Set up interval to refresh token every 5 minutes
    const intervalId = setInterval(refreshToken, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [authMode, token]);

  const setToken = useCallback((newToken: string) => {
    if (typeof window !== 'undefined') {
      // Store in the appropriate key based on auth mode
      const key = authMode === 'auth0' ? JWT_TOKEN_KEY : PAT_TOKEN_KEY;
      localStorage.setItem(key, newToken);
      setTokenState(newToken);
    }
  }, [authMode]);

  const clearToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Clear both token types to ensure clean logout
      localStorage.removeItem(JWT_TOKEN_KEY);
      localStorage.removeItem(PAT_TOKEN_KEY);
      setTokenState(null);
    }
  }, []);

  // PAT-specific method to set token
  const setPatToken = useCallback((newToken: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PAT_TOKEN_KEY, newToken);
      setTokenState(newToken);
    }
  }, []);

  const login = useCallback(async (returnTo?: string) => {
    if (authMode === 'pat') {
      // For PAT mode, redirect to PAT entry page
      const redirectPath = returnTo ?? window.location.pathname;
      window.location.href = `/personal-token?from=${encodeURIComponent(redirectPath)}`;
      return;
    }

    // Auth0 mode
    const client = await getAuthClient();

    localStorage.setItem(REDIRECT_AFTER_LOGIN_PATH_KEY, returnTo ?? window.location.pathname);
    await client.loginWithRedirect({
      authorizationParams: {
        redirect_uri: window.location.origin,
      },
    });
  }, [authMode]);

  const logout = useCallback(async () => {
    clearToken();

    if (authMode === 'auth0') {
      const client = await getAuthClient();
      await client.logout({
        logoutParams: {
          returnTo: window.location.origin,
        },
      });
    } else {
      // For PAT mode, just clear and redirect
      window.location.href = '/personal-token';
    }
  }, [authMode, clearToken]);

  const handleLoginCallback = useCallback(async () => {
    if (authMode !== 'auth0') return;

    try {
      const client = await getAuthClient();

      // Check if the URL contains the code and state parameters
      const urlParams = new URLSearchParams(window.location.search);
      if (!urlParams.has('code') || !urlParams.has('state')) {
        throw new Error('Invalid callback URL');
      }

      await client.handleRedirectCallback();

      const claims = await client.getIdTokenClaims();
      if (claims) {
        setToken(claims.__raw);

        let redirectAfterLoginPath = localStorage.getItem(REDIRECT_AFTER_LOGIN_PATH_KEY);
        // Don't allow absolute URLs to be used as redirect paths (security risk)
        if (redirectAfterLoginPath?.includes('://')) {
          localStorage.removeItem(REDIRECT_AFTER_LOGIN_PATH_KEY);
          redirectAfterLoginPath = null;
        }
        if (redirectAfterLoginPath && !redirectAfterLoginPath.includes('/login')) {
          localStorage.removeItem(REDIRECT_AFTER_LOGIN_PATH_KEY);
          window.location.href = redirectAfterLoginPath;
        } else {
          window.location.href = window.location.origin;
        }
      }
    } catch (error) {
      console.error('Failed to handle login callback:', error);
      setIsHandlingCallback(false);
    }
  }, [authMode, setToken]);

  // Handle Auth0 callback
  useEffect(() => {
    if (authMode !== 'auth0') return;

    if (typeof window !== 'undefined') {
      const query = window.location.search;
      if (query.includes('code=') && query.includes('state=')) {
        if (!handlingLoginCallback) {
          handlingLoginCallback = true;
          setIsHandlingCallback(true);
          handleLoginCallback();
        }
      }
    }
  }, [authMode, handleLoginCallback]);

  // Show nothing while handling callback
  if (isHandlingCallback) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        isLoading,
        authMode,
        login,
        logout,
        setPatToken,
      }}
    >
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  // Use the appropriate token based on auth mode
  const authMode = isAuth0Enabled() ? 'auth0' : 'pat';
  const tokenKey = authMode === 'auth0' ? JWT_TOKEN_KEY : PAT_TOKEN_KEY;
  return localStorage.getItem(tokenKey);
}
