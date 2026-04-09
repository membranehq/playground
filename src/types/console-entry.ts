export interface AccountResponse {
  orgs?: Organization[];
  workspace?: Workspace;
  workspaceUser?: WorkspaceUser;
}

export interface Workspace {
  id: string;
  key: string;
  name: string;
  orgId: Organization['id'];
  secret: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgWorkspacesResponse {
  items: Workspace[];
  cursor?: string;
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
