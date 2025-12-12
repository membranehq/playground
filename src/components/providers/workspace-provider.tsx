'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { ConsoleEntry } from '@/types/console-entry';
import {
  getStoredWorkspace,
  storeWorkspace,
  clearWorkspaceStorage,
} from '@/lib/workspace-storage';

interface WorkspaceContextType {
  workspace: ConsoleEntry['workspace'] | null;
  saveWorkspace: (id: ConsoleEntry['workspace']) => void;
  clearWorkspace: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspace: null,
  saveWorkspace: () => {},
  clearWorkspace: () => {},
});

export function useCurrentWorkspace() {
  return useContext(WorkspaceContext);
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] =
    useState<WorkspaceContextType['workspace']>(getStoredWorkspace());

  const saveWorkspace = useCallback(
    (workspace: WorkspaceContextType['workspace']) => {
      if (!workspace) return;

      storeWorkspace(workspace);
      setWorkspace(workspace);
    },
    [setWorkspace],
  );

  const clearWorkspace = useCallback(() => {
    if (typeof window !== 'undefined') {
      clearWorkspaceStorage();
      setWorkspace(null);
    }
  }, [setWorkspace]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        saveWorkspace,
        clearWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
