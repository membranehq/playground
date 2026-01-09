import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useIntegration, useIntegrations } from '@membranehq/react';
import Image from 'next/image';
import { useIntegrationConnection } from '@/hooks/use-integration-connection';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectAppAndConnectProps {
  selectedIntegrationKey?: string;
  onIntegrationChange: (integrationKey: string) => void;
  onConnectionChange?: () => void;
  onConnectionStateChange?: (isConnected: boolean) => void;
  className?: string;
  showLabel?: boolean;
  label?: string;
  clearFieldsOnIntegrationChange?: string[];
}

export function SelectAppAndConnect({
  selectedIntegrationKey,
  onIntegrationChange,
  onConnectionChange,
  onConnectionStateChange,
  className = '',
  showLabel = true,
  label = 'App',
}: SelectAppAndConnectProps) {
  const { integration: selectedIntegration } = useIntegration(selectedIntegrationKey as string);
  const { integrations } = useIntegrations();
  const [open, setOpen] = useState(false);

  // Integration connection hook
  const {
    data: connection,
    isLoading: isConnectionLoading,
    isConnecting,
    connect,
  } = useIntegrationConnection({
    integrationKey: selectedIntegrationKey || '',
  });

  const isConnected = !!connection;

  // Notify parent component about connection state changes
  React.useEffect(() => {
    onConnectionStateChange?.(isConnected);
  }, [isConnected, onConnectionStateChange]);

  const handleConnect = () => {
    connect();
    onConnectionChange?.();
  };

  const handleSelect = (integrationKey: string) => {
    onIntegrationChange(integrationKey);
    setOpen(false);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* App Selection Section */}
      {showLabel && <Label required>{label}</Label>}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {selectedIntegrationKey && selectedIntegration ? (
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between p-3 h-auto"
            >
              <div className="flex items-center gap-3">
                {selectedIntegration.logoUri ? (
                  <Image
                    width={20}
                    height={20}
                    src={selectedIntegration.logoUri}
                    alt={`${selectedIntegration.name} logo`}
                    className="w-5 h-5 rounded"
                  />
                ) : (
                  <div className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {selectedIntegration.name[0]}
                  </div>
                )}
                <span className="text-sm font-medium text-foreground">{selectedIntegration.name}</span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          ) : (
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between p-3 h-auto"
            >
              <span className="text-sm font-medium text-muted-foreground">Select an app</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search integrations..." />
            <CommandList>
              <CommandEmpty>No integration found.</CommandEmpty>
              <CommandGroup>
                {integrations.map((integration) => (
                  <CommandItem
                    key={integration.key}
                    value={integration.name}
                    onSelect={() => handleSelect(integration.key || '')}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {integration.logoUri ? (
                        <Image
                          width={20}
                          height={20}
                          src={integration.logoUri}
                          alt={`${integration.name} logo`}
                          className="w-5 h-5 rounded"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-xs font-medium text-muted-foreground">
                          {integration.name[0]}
                        </div>
                      )}
                      <span className="text-sm">{integration.name}</span>
                    </div>
                    <Check
                      className={cn(
                        'ml-2 h-4 w-4',
                        selectedIntegrationKey === integration.key ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Connection Status Section */}
      {selectedIntegrationKey && selectedIntegration && (
        <div className="space-y-2">
          <Label required>Account</Label>
          {isConnectionLoading ? (
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ) : isConnected ? (
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {selectedIntegration.logoUri ? (
                  <Image
                    width={20}
                    height={20}
                    src={selectedIntegration.logoUri}
                    alt={`${selectedIntegration.name} logo`}
                    className="w-5 h-5 rounded"
                  />
                ) : (
                  <div className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {selectedIntegration.name[0]}
                  </div>
                )}
                <span className="text-sm font-medium text-foreground">Connected to {selectedIntegration.name}</span>
              </div>
              <Button onClick={handleConnect} disabled={isConnecting} variant="outline" size="sm" className="rounded-full">
                {isConnecting ? 'Reconnecting...' : 'Reconnect'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {selectedIntegration.logoUri ? (
                  <Image
                    width={20}
                    height={20}
                    src={selectedIntegration.logoUri}
                    alt={`${selectedIntegration.name} logo`}
                    className="w-5 h-5 rounded"
                  />
                ) : (
                  <div className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {selectedIntegration.name[0]}
                  </div>
                )}
                <span className="text-sm font-medium text-foreground">Connect {selectedIntegration.name}</span>
              </div>
              <Button onClick={handleConnect} disabled={isConnecting} variant="default" size="sm" className="rounded-full">
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


