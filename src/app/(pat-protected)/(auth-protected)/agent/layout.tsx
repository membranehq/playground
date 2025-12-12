'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// Context to share session creation state between layout and pages
interface AgentContextType {
  isCreating: boolean;
  createSession: () => Promise<void>;
}

const AgentContext = createContext<AgentContextType | null>(null);

export function useAgentContext() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgentContext must be used within AgentLayout');
  }
  return context;
}

// This layout is a pass-through - the actual header is rendered by each page
// to allow customization of the right-side actions
export default function AgentLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
