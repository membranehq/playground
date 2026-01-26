import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useIntegration, useIntegrations } from '@membranehq/react';
import Image from 'next/image';
import { useIntegrationConnection } from '@/hooks/use-integration-connection';
import { Plus } from 'lucide-react';
import { NodeCreateDialog } from '@/app/(pat-protected)/(auth-protected)/workflows/[id]/components/dialogs/node-create-dialog';

interface SelectAppAndConnectProps {
  selectedIntegrationKey?: string;
  onIntegrationChange: (integrationKey: string) => void;
  onConnectionChange?: () => void;
  onConnectionStateChange?: (isConnected: boolean) => void;
  className?: string;
  showLabel?: boolean;
  label?: string;
  clearFieldsOnIntegrationChange?: string[];
  onAddAppIntegration?: (integrationKey: string) => void;
  onOpenMembraneAgent?: (message: string) => void;
}

export function SelectAppAndConnect({
  selectedIntegrationKey,
  onIntegrationChange,
  onConnectionChange,
  onConnectionStateChange,
  className = '',
  showLabel = true,
  label = 'App',
  onAddAppIntegration,
  onOpenMembraneAgent,
}: SelectAppAndConnectProps) {
  const { integration: selectedIntegration } = useIntegration(selectedIntegrationKey as string);
  const { integrations } = useIntegrations();
  const [addAppDialogOpen, setAddAppDialogOpen] = useState(false);

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

  return (
    <div className={`space-y-4 ${className}`}>
      {/* App Selection Section */}
      {showLabel && <Label required>{label}</Label>}

      <Select
        value={selectedIntegrationKey || ''}
        onValueChange={(value) => {
          if (value === 'add-new-app') {
            setAddAppDialogOpen(true);
          } else {
            onIntegrationChange(value);
          }
        }}
      >
        <SelectTrigger className="w-full h-10">
          {selectedIntegration ? (
            <div className="flex items-center gap-2">
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
              <span className="text-sm">{selectedIntegration.name}</span>
            </div>
          ) : (
            <SelectValue placeholder="Select an app" />
          )}
        </SelectTrigger>
        <SelectContent>
          {integrations.map((integration) => (
            <SelectItem key={integration.key} value={integration.key || ''}>
              <div className="flex items-center gap-2">
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
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value="add-new-app">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-600">Add app integration</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Connection Status Section */}
      {selectedIntegrationKey && selectedIntegration && (
        <div className="space-y-2">
          <Label required>Account</Label>
          {isConnectionLoading ? (
            <div className="flex items-center justify-between px-3 h-10 border rounded-lg">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ) : isConnected ? (
            <div className="flex items-center justify-between px-3 h-10 border rounded-lg">
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
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                variant="outline"
                size="xs"
                className="rounded-full"
              >
                {isConnecting ? 'Reconnecting...' : 'Reconnect'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 h-10 border rounded-lg">
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
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                variant="default"
                size="xs"
                className="rounded-full"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add App Integration Dialog - opens directly to search view */}
      <NodeCreateDialog
        isOpen={addAppDialogOpen}
        onClose={() => setAddAppDialogOpen(false)}
        onCreate={(type, config) => {
          if (type === 'action' && config?.integrationKey) {
            // When a new integration is created, update the current node's integration
            onIntegrationChange(config.integrationKey as string);
            onAddAppIntegration?.(config.integrationKey as string);
          }
          setAddAppDialogOpen(false);
        }}
        initialViewMode="search"
        onOpenMembraneAgent={onOpenMembraneAgent}
      />
    </div>
  );
}
