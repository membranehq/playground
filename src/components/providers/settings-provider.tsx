'use client';

import { createContext, useCallback, useContext, useState, useEffect } from 'react';

type ConnectionUIMode = 'default' | 'custom';

interface SettingsContextType {
  connectionUIMode: ConnectionUIMode;
  setConnectionUIMode: (mode: ConnectionUIMode) => void;
}

const STORAGE_KEY = 'playground-connection-ui-mode';

function getStoredConnectionUIMode(): ConnectionUIMode {
  if (typeof window === 'undefined') return 'default';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'custom' ? 'custom' : 'default';
}

const SettingsContext = createContext<SettingsContextType>({
  connectionUIMode: 'default',
  setConnectionUIMode: () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [connectionUIMode, setConnectionUIModeState] = useState<ConnectionUIMode>('default');

  useEffect(() => {
    setConnectionUIModeState(getStoredConnectionUIMode());
  }, []);

  const setConnectionUIMode = useCallback((mode: ConnectionUIMode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode);
    }
    setConnectionUIModeState(mode);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        connectionUIMode,
        setConnectionUIMode,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
