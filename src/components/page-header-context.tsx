'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface PageHeaderContextType {
  headerActions: ReactNode | null;
  setHeaderActions: (actions: ReactNode | null) => void;
  headerLeft: ReactNode | null;
  setHeaderLeft: (content: ReactNode | null) => void;
}

const PageHeaderContext = createContext<PageHeaderContextType | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [headerActions, setHeaderActions] = useState<ReactNode | null>(null);
  const [headerLeft, setHeaderLeft] = useState<ReactNode | null>(null);

  return (
    <PageHeaderContext.Provider value={{ headerActions, setHeaderActions, headerLeft, setHeaderLeft }}>
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

// Component to set header actions from child pages (right side)
export function PageHeaderActions({ children }: { children: ReactNode }) {
  const { setHeaderActions } = usePageHeader();

  useEffect(() => {
    setHeaderActions(children);
    return () => setHeaderActions(null);
  }, [children, setHeaderActions]);

  return null;
}

// Component to set header left content from child pages (left side, replaces breadcrumbs)
export function PageHeaderLeft({ children }: { children: ReactNode }) {
  const { setHeaderLeft } = usePageHeader();

  useEffect(() => {
    setHeaderLeft(children);
    return () => setHeaderLeft(null);
  }, [children, setHeaderLeft]);

  return null;
}
