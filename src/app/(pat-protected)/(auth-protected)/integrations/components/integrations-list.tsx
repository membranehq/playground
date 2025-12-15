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
import { useIntegrationApp, useIntegrations } from '@membranehq/react';
import type { Integration as IntegrationAppIntegration } from '@membranehq/sdk';
import { ArrowRight, Loader2, Plug, X, Search } from 'lucide-react';
import Link from 'next/link';

export function IntegrationList() {
  const integrationApp = useIntegrationApp();
  const { integrations, refresh, loading } = useIntegrations();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIntegrations = useMemo(() => {
    if (!searchQuery.trim()) return integrations;
    const query = searchQuery.toLowerCase();
    return integrations.filter(
      (integration) =>
        integration.name.toLowerCase().includes(query) ||
        integration.key?.toLowerCase().includes(query)
    );
  }, [integrations, searchQuery]);

  const handleConnect = async (integration: IntegrationAppIntegration) => {
    if (!integration.key) return;
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
    return (
      <div className='mt-8 flex items-center justify-center py-12'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    );
  }

  if (!integrations.length) {
    return (
      <div className='mt-8 flex flex-col items-center justify-center py-12 text-center'>
        <p className='text-muted-foreground'>No integrations found</p>
        <p className='text-sm text-muted-foreground/60 mt-1'>
          Configure integrations in your workspace
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className='mt-6 relative'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500' />
        <Input
          placeholder='Search integrations...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className='pl-9 bg-neutral-900/50 border-neutral-800 focus:border-neutral-700 placeholder:text-neutral-600'
        />
      </div>
      {filteredIntegrations.length === 0 ? (
        <div className='mt-8 flex flex-col items-center justify-center py-12 text-center'>
          <p className='text-muted-foreground'>No matching integrations</p>
          <p className='text-sm text-muted-foreground/60 mt-1'>
            Try a different search term
          </p>
        </div>
      ) : (
        <ul className='mt-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3'>
          {filteredIntegrations.map((integration) => (
          <li
            key={integration.key}
            className='group flex items-center gap-4 p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl transition-all hover:bg-neutral-800/50 hover:border-neutral-700'
          >
            <div className='shrink-0'>
              <Avatar size='lg' variant='square' className='ring-1 ring-neutral-700'>
                <AvatarImage src={integration.logoUri} />
                <AvatarFallback size='lg' variant='square' className='bg-neutral-800 text-neutral-400'>
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
              {integration.connection ? (
                <>
                  <Button variant='ghost' size='sm' asChild className='text-neutral-400 hover:text-neutral-200'>
                    <Link href={`/integrations/${integration.key}`}>
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
                        onClick={() => handleDisconnect(integration)}
                      >
                        <X className='h-4 w-4' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Disconnect</TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <Button
                  variant='outline'
                  size='sm'
                  className='border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800'
                  onClick={() => handleConnect(integration)}
                >
                  <Plug className='h-3.5 w-3.5' />
                  Connect
                </Button>
              )}
            </div>
          </li>
        ))}
        </ul>
      )}
    </TooltipProvider>
  );
}
