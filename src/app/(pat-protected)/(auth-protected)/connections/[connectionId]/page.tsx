'use client';

import { useConnection, useIntegrationApp } from '@membranehq/react';
import { useParams, useRouter } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

import { ActionsCard } from './components/actions-card';
import { FlowsCard } from './components/flows-card';
import { FieldMappingsCard } from './components/field-mappings-card';
import { DataSourcesCard } from './components/data-sources-card';
import { CircleX, Cog, Loader2 } from 'lucide-react';

export default function ConnectionPage() {
  const router = useRouter();
  const integrationApp = useIntegrationApp();
  const { connectionId } = useParams<{ connectionId: string }>();
  const { connection, loading, archive } = useConnection(connectionId);

  const handleDisconnect = async () => {
    if (!connection?.id) return;
    try {
      await archive();
      router.push('/integrations');
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleConfigure = () => {
    if (!connection?.integration?.key) return;
    integrationApp.integration(connection.integration.key).open();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="px-6 py-6">
        <p className="text-muted-foreground">Connection not found</p>
      </div>
    );
  }

  const integrationName = connection.integration?.name || 'Unknown Integration';
  const integrationLogo = connection.integration?.logoUri;

  return (
    <div className="px-6 py-6 flex flex-col gap-8">
      <div className="flex flex-row justify-start gap-4 items-center">
        <div className="shrink-0">
          <Avatar size="lg" variant="square" className="ring-1 ring-neutral-200">
            <AvatarImage src={integrationLogo} />
            <AvatarFallback size="lg" variant="square" className="bg-neutral-100 text-neutral-600">
              {integrationName[0]}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-neutral-900">{connection.name || integrationName}</h1>
          {connection.name && connection.name !== integrationName && (
            <p className="text-sm text-neutral-500">{integrationName}</p>
          )}
        </div>

        {connection.integration?.key && (
          <Button
            variant="outline"
            onClick={handleConfigure}
            className="border-neutral-300 hover:border-neutral-400 hover:bg-neutral-100"
          >
            <Cog className="h-4 w-4" />
            Configure
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={handleDisconnect}
          className="text-neutral-500 hover:text-red-500 hover:bg-red-50"
        >
          <CircleX className="h-4 w-4" />
          Disconnect
        </Button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        <ActionsCard connectionId={connectionId} />
        <FlowsCard connectionId={connectionId} />
        <DataSourcesCard connectionId={connectionId} />
        <FieldMappingsCard connectionId={connectionId} />
      </div>
    </div>
  );
}
