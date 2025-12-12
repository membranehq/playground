'use client';

import type { Integration as IntegrationAppIntegration } from '@integration-app/sdk';
import { useIntegration, useIntegrationApp } from '@integration-app/react';
import { useParams } from 'next/navigation';

import { OpenGhButton } from '@/components/open-gh-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

import { ActionsCard } from './components/actions-card';
import { FlowsCard } from './components/flows-card';
import { FieldMappingsCard } from './components/field-mappings-card';
import { DataSourcesCard } from './components/data-sources-card';
import { CircleX, Cog, Unplug } from 'lucide-react';

export default function Connections() {
  const integrationApp = useIntegrationApp();
  const { integrationKey } = useParams<{ integrationKey: string }>();
  const { integration, loading, refresh } = useIntegration(integrationKey);

  const handleConnect = async (integration: IntegrationAppIntegration) => {
    try {
      await integrationApp.integration(integration.key).openNewConnection();
      refresh();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const handleDisconnect = async (integration: IntegrationAppIntegration) => {
    if (!integration.connection?.id) return;
    try {
      await integrationApp.connection(integration.connection.id).archive();
      refresh();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!integration) {
    return <div>Integration not found</div>;
  }

  return (
    <div className='px-4 py-6 sm:px-0 flex flex-col gap-8'>
      <div className='flex flex-row justify-start gap-2 items-center'>
        <div className='shrink-0'>
          <Avatar size='lg' variant='square'>
            <AvatarImage src={integration.logoUri} />
            <AvatarFallback size='lg' variant='square'>
              {integration.name[0]}
            </AvatarFallback>
          </Avatar>
        </div>
        <h1 className='text-3xl flex-1 font-bold text-primary'>
          {integration.name}
        </h1>

        {integration.connection ? (
          <Button
            className='z-10'
            variant='outline'
            onClick={() => integrationApp.integration(integration.key).open()}
          >
            Configure <Cog />
          </Button>
        ) : null}
        <Button
          className='z-10'
          variant={integration.connection ? 'destructive' : 'default'}
          onClick={() =>
            integration.connection
              ? handleDisconnect(integration)
              : handleConnect(integration)
          }
        >
          {integration.connection ? (
            <>
              Disconnect
              <CircleX />
            </>
          ) : (
            <>
              Connect
              <Unplug />
            </>
          )}
        </Button>
        <OpenGhButton metaUrl={import.meta.url} />
      </div>

      <div className='grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4'>
        <ActionsCard
          integrationId={integration.id}
          isConencted={!!integration.connection}
        />
        <FlowsCard
          integrationId={integration.id}
          isConencted={!!integration.connection}
        />
        <DataSourcesCard
          integrationId={integration.id}
          isConencted={!!integration.connection}
        />
        <FieldMappingsCard
          integrationId={integration.id}
          isConencted={!!integration.connection}
        />
      </div>
    </div>
  );
}
