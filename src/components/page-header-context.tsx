'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface PageHeaderContextType {
  headerActions: ReactNode | null;
  setHeaderActions: (actions: ReactNode | null) => void;
}

const PageHeaderContext = createContext<PageHeaderContextType | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [headerActions, setHeaderActions] = useState<ReactNode | null>(null);

  return (
    <PageHeaderContext.Provider value={{ headerActions, setHeaderActions }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  const context = useContext(PageHeaderContext);
  if (!context) {
    throw new Error('usePageHeader must be used within PageHeaderProvider');
  }
  return context;
}

// Component to set header actions from child pages
export function PageHeaderActions({ children }: { children: ReactNode }) {
  const { setHeaderActions } = usePageHeader();

  useEffect(() => {
    setHeaderActions(children);
    return () => setHeaderActions(null);
  }, [children, setHeaderActions]);

  return null;
}
