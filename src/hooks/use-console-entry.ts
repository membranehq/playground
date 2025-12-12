import useSWR from 'swr';

import { personalAccessTokenAuthFetcher } from '@/lib/fetch-utils';
import { ConsoleEntry, Organization } from '@/types/console-entry';
import { useConsoleAuth } from '@/components/providers/console-auth-provider';
import { useMemo } from 'react';

type WorkspaceMap = Record<string, ConsoleEntry['workspace']>;
type OrganizationMap = Record<string, Organization>;

export function useConsoleEntry(): Partial<ConsoleEntry> & {
  workspaces?: Array<
    ConsoleEntry['workspaces'][number] & { org?: Organization }
  >;

  workspacesMap: WorkspaceMap;
  orgsMap: OrganizationMap;

  isLoading: boolean;
  isError: boolean;
} {
  const { token } = useConsoleAuth();

  const { data, error, isLoading } = useSWR<ConsoleEntry>(
    token ? ['/console-self', token] : null,
    ([url]) => personalAccessTokenAuthFetcher<ConsoleEntry>(url),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  const workspacesMap = useMemo(() => {
    return (
      data?.workspaces.reduce<Record<string, ConsoleEntry['workspace']>>(
        (acc, workspace) => {
          acc[workspace.id] = workspace;
          return acc;
        },
        {},
      ) || {}
    );
  }, [data?.workspaces]);

  const orgsMap = useMemo(() => {
    return (
      data?.orgs.reduce<Record<string, Organization>>((acc, org) => {
        acc[org.id] = org;
        return acc;
      }, {}) || {}
    );
  }, [data?.orgs]);

  const workspacesWithOrgs = useMemo(() => {
    return (
      data?.workspaces.map<
        ConsoleEntry['workspaces'][number] & { org?: Organization }
      >((workspace) => {
        return { ...workspace, org: orgsMap[workspace.orgId] };
      }) || []
    );
  }, [data?.workspaces, orgsMap]);

  return {
    workspaces: workspacesWithOrgs,
    orgs: data?.orgs,

    workspacesMap,
    orgsMap,

    isLoading,
    isError: !!error,
  };
}
