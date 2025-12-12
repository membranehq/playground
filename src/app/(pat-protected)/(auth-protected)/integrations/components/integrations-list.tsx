'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useIntegrationApp, useIntegrations } from '@integration-app/react';
import type { Integration as IntegrationAppIntegration } from '@integration-app/sdk';
import { ArrowRight, CircleX, Unplug } from 'lucide-react';
import Link from 'next/link';

export function IntegrationList() {
  const integrationApp = useIntegrationApp();
  const { integrations, refresh, loading } = useIntegrations();

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

  return (
    <TooltipProvider delayDuration={0}>
      <ul className='space-y-4 mt-8 grid grid-cols-1 xl:grid-cols-2 gap-4'>
        {loading && <span>Loading</span>}
        {!loading && !integrations.length && <span>No integrations found</span>}
        {integrations.map((integration) => (
          <li
            key={integration.key}
            className='flex items-center space-x-4 p-4 bg-card text-card-foreground border rounded-lg h-full'
          >
            <div className='shrink-0'>
              <Avatar size='lg' variant='square'>
                <AvatarImage src={integration.logoUri} />
                <AvatarFallback size='lg' variant='square'>
                  {integration.name[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className='flex-1 min-w-0 flex flex-col gap-2'>
              <span
                className={cn(
                  'text-xl leading-none font-semibold flex flex-row gap-1 items-center',
                )}
              >
                {integration.name}
              </span>
              <Badge variant='secondary'>{integration.key}</Badge>
            </div>
            <div className='flex gap-2'>
              {integration.connection && (
                <Button variant='outline' asChild>
                  <Link href={`/integrations/${integration.key}`}>
                    Open <ArrowRight />
                  </Link>
                </Button>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
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
                      <CircleX />
                    ) : (
                      <>
                        Connect
                        <Unplug />
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {integration.connection ? 'Disconnect' : 'Connect'}
                </TooltipContent>
              </Tooltip>
            </div>
          </li>
        ))}
      </ul>
    </TooltipProvider>
  );
}
