export interface ConsoleEntry {
  workspace: Workspace;
  workspaces: Workspace[];
  workspaceUser: WorkspaceUser;
  orgs: Organization[];
}

interface Workspace {
  id: string;
  key: string;
  name: string;
  orgId: Organization['id'];
  secret: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceUser {
  id: string;
  testCustomerId: string;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
