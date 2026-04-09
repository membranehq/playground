import useSWR from 'swr';

import { jwtAuthFetcher } from '@/lib/fetch-utils';
import { AccountResponse, Organization, OrgWorkspacesResponse, Workspace } from '@/types/console-entry';
import { useAuth } from '@/components/providers/auth-provider';
import { useMemo } from 'react';

type WorkspaceMap = Record<string, Workspace>;
type OrganizationMap = Record<string, Organization>;

export function useConsoleEntry(): {
  workspaces: Array<Workspace & { org?: Organization }>;
  orgs?: Organization[];

  workspacesMap: WorkspaceMap;
  orgsMap: OrganizationMap;

  isLoading: boolean;
  isError: boolean;
} {
  const { token } = useAuth();

  const {
    data: accountData,
    error: accountError,
    isLoading: accountLoading,
  } = useSWR<AccountResponse>(
    token ? ['/account', token] : null,
    ([url]) => jwtAuthFetcher<AccountResponse>(url),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  const {
    data: workspacesData,
    error: workspacesError,
    isLoading: workspacesLoading,
  } = useSWR<OrgWorkspacesResponse>(
    token ? ['/org-workspaces', token] : null,
    ([url]) => jwtAuthFetcher<OrgWorkspacesResponse>(url),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  const workspaces = workspacesData?.items;
  const orgs = accountData?.orgs;

  const workspacesMap = useMemo(() => {
    return (
      workspaces?.reduce<WorkspaceMap>((acc, workspace) => {
        acc[workspace.id] = workspace;
        return acc;
      }, {}) || {}
    );
  }, [workspaces]);

  const orgsMap = useMemo(() => {
    return (
      orgs?.reduce<OrganizationMap>((acc, org) => {
        acc[org.id] = org;
        return acc;
      }, {}) || {}
    );
  }, [orgs]);

  const workspacesWithOrgs = useMemo(() => {
    return (
      workspaces?.map<Workspace & { org?: Organization }>((workspace) => {
        return { ...workspace, org: orgsMap[workspace.orgId] };
      }) || []
    );
  }, [workspaces, orgsMap]);

  return {
    workspaces: workspacesWithOrgs,
    orgs,

    workspacesMap,
    orgsMap,

    isLoading: accountLoading || workspacesLoading,
    isError: !!accountError || !!workspacesError,
  };
}
