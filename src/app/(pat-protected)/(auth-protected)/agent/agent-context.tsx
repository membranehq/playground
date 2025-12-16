'use client';

import { createContext, useContext } from 'react';

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

export { AgentContext };
export type { AgentContextType };
