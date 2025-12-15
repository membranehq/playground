'use client';

import { useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useIntegrationApp,
  useIntegrations,
  useConnections,
} from '@membranehq/react';
import type { Integration as IntegrationAppIntegration } from '@membranehq/sdk';
import { ArrowRight, Loader2, Plug, X, Search, Cable } from 'lucide-react';
import Link from 'next/link';

export function IntegrationList() {
  const integrationApp = useIntegrationApp();
  const { integrations, refresh: refreshIntegrations, loading: integrationsLoading } = useIntegrations();
  const { connections, refresh: refreshConnections, loading: connectionsLoading } = useConnections();
  const [searchQuery, setSearchQuery] = useState('');

  const loading = integrationsLoading || connectionsLoading;

  // Get integration IDs that have connections
  const connectedIntegrationIds = useMemo(() => {
    return new Set(connections.map((c) => c.integrationId));
  }, [connections]);

  // Filter integrations without connections
  const availableIntegrations = useMemo(() => {
    return integrations.filter((i) => !connectedIntegrationIds.has(i.id));
  }, [integrations, connectedIntegrationIds]);

  // Filter connections based on search
  const filteredConnections = useMemo(() => {
    if (!searchQuery.trim()) return connections;
    const query = searchQuery.toLowerCase();
    return connections.filter(
      (connection) =>
        connection.name?.toLowerCase().includes(query) ||
        connection.integration?.name?.toLowerCase().includes(query) ||
        connection.integration?.key?.toLowerCase().includes(query)
    );
  }, [connections, searchQuery]);

  // Filter available integrations based on search
  const filteredAvailableIntegrations = useMemo(() => {
    if (!searchQuery.trim()) return availableIntegrations;
    const query = searchQuery.toLowerCase();
    return availableIntegrations.filter(
      (integration) =>
        integration.name.toLowerCase().includes(query) ||
        integration.key?.toLowerCase().includes(query)
    );
  }, [availableIntegrations, searchQuery]);

  const handleConnect = async (integration: IntegrationAppIntegration) => {
    if (!integration.key) return;
    try {
      await integrationApp.integration(integration.key).openNewConnection();
      refreshIntegrations();
      refreshConnections();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      await integrationApp.connection(connectionId).archive();
      refreshIntegrations();
      refreshConnections();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  if (loading) {
    return (
      <div className='mt-8 flex items-center justify-center py-12'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    );
  }

  if (!integrations.length && !connections.length) {
    return (
      <div className='mt-8 flex flex-col items-center justify-center py-12 text-center'>
        <p className='text-muted-foreground'>No integrations found</p>
        <p className='text-sm text-muted-foreground/60 mt-1'>
          Configure integrations in your workspace
        </p>
      </div>
    );
  }

  const noResults =
    filteredConnections.length === 0 && filteredAvailableIntegrations.length === 0;

  return (
    <TooltipProvider delayDuration={0}>
      <div className='mt-6 relative'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500' />
        <Input
          placeholder='Search connections and integrations...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className='pl-9 bg-neutral-900/50 border-neutral-800 focus:border-neutral-700 placeholder:text-neutral-600'
        />
      </div>

      {noResults ? (
        <div className='mt-8 flex flex-col items-center justify-center py-12 text-center'>
          <p className='text-muted-foreground'>No matching results</p>
          <p className='text-sm text-muted-foreground/60 mt-1'>
            Try a different search term
          </p>
        </div>
      ) : (
        <>
          {/* Your Connections Section */}
          {filteredConnections.length > 0 && (
            <section className='mt-6'>
              <div className='flex items-center gap-2 mb-4'>
                <Cable className='h-4 w-4 text-neutral-500' />
                <h2 className='text-lg font-medium text-neutral-200'>
                  Your Connections
                </h2>
                <span className='text-sm text-neutral-500'>
                  ({filteredConnections.length})
                </span>
              </div>
              <ul className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3'>
                {filteredConnections.map((connection) => (
                  <li
                    key={connection.id}
                    className='group flex items-center gap-4 p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl transition-all hover:bg-neutral-800/50 hover:border-neutral-700'
                  >
                    <div className='shrink-0'>
                      <Avatar
                        size='lg'
                        variant='square'
                        className='ring-1 ring-neutral-700'
                      >
                        <AvatarImage src={connection.integration?.logoUri} />
                        <AvatarFallback
                          size='lg'
                          variant='square'
                          className='bg-neutral-800 text-neutral-400'
                        >
                          {connection.name?.[0] ||
                            connection.integration?.name?.[0] ||
                            '?'}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className='flex-1 min-w-0'>
                      <h3 className='font-medium text-neutral-200 truncate'>
                        {connection.name || connection.integration?.name}
                      </h3>
                      <p className='text-xs text-neutral-500 font-mono truncate'>
                        {connection.integration?.key}
                      </p>
                    </div>

                    <div className='flex items-center gap-2 shrink-0'>
                      <Button
                        variant='ghost'
                        size='sm'
                        asChild
                        className='text-neutral-400 hover:text-neutral-200'
                      >
                        <Link href={`/connections/${connection.id}`}>
                          Open
                          <ArrowRight className='h-3.5 w-3.5' />
                        </Link>
                      </Button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            className='text-neutral-500 hover:text-red-400 hover:bg-red-400/10'
                            onClick={() => handleDisconnect(connection.id)}
                          >
                            <X className='h-4 w-4' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Disconnect</TooltipContent>
                      </Tooltip>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Available Integrations Section */}
          {filteredAvailableIntegrations.length > 0 && (
            <section className='mt-8'>
              <div className='flex items-center gap-2 mb-4'>
                <Plug className='h-4 w-4 text-neutral-500' />
                <h2 className='text-lg font-medium text-neutral-200'>
                  Available Integrations
                </h2>
                <span className='text-sm text-neutral-500'>
                  ({filteredAvailableIntegrations.length})
                </span>
              </div>
              <ul className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3'>
                {filteredAvailableIntegrations.map((integration) => (
                  <li
                    key={integration.key}
                    className='group flex items-center gap-4 p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl transition-all hover:bg-neutral-800/50 hover:border-neutral-700'
                  >
                    <div className='shrink-0'>
                      <Avatar
                        size='lg'
                        variant='square'
                        className='ring-1 ring-neutral-700'
                      >
                        <AvatarImage src={integration.logoUri} />
                        <AvatarFallback
                          size='lg'
                          variant='square'
                          className='bg-neutral-800 text-neutral-400'
                        >
                          {integration.name[0]}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className='flex-1 min-w-0'>
                      <h3 className='font-medium text-neutral-200 truncate'>
                        {integration.name}
                      </h3>
                      <p className='text-xs text-neutral-500 font-mono truncate'>
                        {integration.key}
                      </p>
                    </div>

                    <div className='flex items-center gap-2 shrink-0'>
                      <Button
                        variant='outline'
                        size='sm'
                        className='border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800'
                        onClick={() => handleConnect(integration)}
                      >
                        <Plug className='h-3.5 w-3.5' />
                        Connect
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </TooltipProvider>
  );
}
