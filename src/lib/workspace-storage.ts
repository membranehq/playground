import { ConsoleEntry } from '@/types/console-entry';

const WORKSPACE_STORAGE_KEY = 'selected_workspace';

export function getStoredWorkspace(): ConsoleEntry['workspace'] | null {
  if (typeof window === 'undefined') return null;

  try {
    const workspace = localStorage.getItem(WORKSPACE_STORAGE_KEY);

    if (!workspace) return null;

    return JSON.parse(workspace) as ConsoleEntry['workspace'];
  } catch {
    clearWorkspaceStorage();
    return null;
  }
}

export function storeWorkspace(workspace: ConsoleEntry['workspace']): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
}

export function clearWorkspaceStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WORKSPACE_STORAGE_KEY);
}

export function getWorkspaceHeaders() {
  const headers: Record<string, string> = {};
  const workspace = getStoredWorkspace();

  if (workspace?.key) {
    headers['x-workspace-key'] = workspace?.key;
  }

  if (workspace?.secret) {
    headers['x-workspace-secret'] = workspace?.secret;
  }

  return headers;
}
