"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
} from "react";
import { ConsoleEntry } from "@/types/console-entry";
import {
  getStoredWorkspace,
  storeWorkspace,
  clearWorkspaceStorage,
} from "@/lib/workspace-storage";

interface WorkspaceContextType {
  workspace: ConsoleEntry["workspace"] | null;
  isLoading: boolean;
  saveWorkspace: (id: ConsoleEntry["workspace"]) => void;
  clearWorkspace: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspace: null,
  isLoading: true,
  saveWorkspace: () => {},
  clearWorkspace: () => {},
});

export function useCurrentWorkspace() {
  return useContext(WorkspaceContext);
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] =
    useState<WorkspaceContextType["workspace"]>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize workspace from localStorage on mount
  useEffect(() => {
    const storedWorkspace = getStoredWorkspace();
    setWorkspace(storedWorkspace);
    setIsLoading(false);
  }, []);

  const saveWorkspace = useCallback(
    (workspace: WorkspaceContextType["workspace"]) => {
      if (!workspace) return;

      storeWorkspace(workspace);
      setWorkspace(workspace);
    },
    []
  );

  const clearWorkspace = useCallback(() => {
    clearWorkspaceStorage();
    setWorkspace(null);
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        isLoading,
        saveWorkspace,
        clearWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
