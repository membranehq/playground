import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useIntegration, useIntegrations, useConnections } from '@membranehq/react';
import Image from 'next/image';
import { useIntegrationConnection } from '@/hooks/use-integration-connection';
import { useConnectorConnection } from '@/hooks/use-connector-connection';
import { useConnectors } from '@/hooks/use-connectors';
import { Plus } from 'lucide-react';
import { NodeCreateDialog } from '@/app/(pat-protected)/(auth-protected)/workflows/[id]/components/dialogs/node-create-dialog';

interface SelectAppAndConnectProps {
  selectedIntegrationKey?: string;
  selectedConnectorId?: string;
  selectedConnectorName?: string;
  selectedConnectorLogoUri?: string;
  onIntegrationChange: (integrationKey: string) => void;
  onConnectorChange?: (connectorId: string, connectorName?: string, connectorLogoUri?: string) => void;
  onConnectionChange?: (connectionId: string | null) => void;
  onConnectionStateChange?: (isConnected: boolean, connectionId?: string) => void;
  className?: string;
  showLabel?: boolean;
  label?: string;
  clearFieldsOnIntegrationChange?: string[];
  onAddAppIntegration?: (integrationKey: string) => void;
  onOpenMembraneAgent?: (message: string) => void;
  refreshKey?: number;
}

export function SelectAppAndConnect({
  selectedIntegrationKey,
  selectedConnectorId,
  selectedConnectorName,
  selectedConnectorLogoUri,
  onIntegrationChange,
  onConnectorChange,
  onConnectionChange,
  onConnectionStateChange,
  className = '',
  showLabel = true,
  label = 'App',
  onAddAppIntegration,
  onOpenMembraneAgent,
  refreshKey,
}: SelectAppAndConnectProps) {
  const { integration: selectedIntegration } = useIntegration(selectedIntegrationKey as string);
  const { integrations, refresh: refreshIntegrations } = useIntegrations();
  const { items: connections, refresh: refreshConnections } = useConnections();
  const { connectors: tenantConnectors, refetch: refetchConnectors } = useConnectors({ tenantOnly: true });

  // Refresh integrations, connections, and connectors when refreshKey changes
  React.useEffect(() => {
    if (refreshKey) {
      refreshIntegrations?.();
      refreshConnections?.();
      refetchConnectors?.();
    }
  }, [refreshKey, refreshIntegrations, refreshConnections, refetchConnectors]);
  const [addAppDialogOpen, setAddAppDialogOpen] = useState(false);

  // Get connector-based connections (connections without an integration)
  // These are tenant-level connections created directly to connectors
  const connectorConnections = React.useMemo(() => {
    return connections.filter((conn) => !conn.integrationId && conn.connectorId);
  }, [connections]);

  // Get tenant-level connectors that don't have a connection yet
  // These are connectors created by the agent that the user hasn't connected to
  const unconnectedTenantConnectors = React.useMemo(() => {
    const connectedConnectorIds = new Set(connectorConnections.map((conn) => conn.connectorId));
    return tenantConnectors.filter((connector) => !connectedConnectorIds.has(connector.id));
  }, [tenantConnectors, connectorConnections]);

  // Integration connection hook (for integrationKey mode)
  const {
    data: integrationConnection,
    isLoading: isIntegrationConnectionLoading,
    isConnecting: isIntegrationConnecting,
    connect: connectIntegration,
  } = useIntegrationConnection({
    integrationKey: selectedIntegrationKey || '',
  });

  // Connector connection hook (for connectorId mode)
  const {
    data: connectorConnection,
    isLoading: isConnectorConnectionLoading,
    isConnecting: isConnectorConnecting,
    connect: connectConnector,
  } = useConnectorConnection({
    connectorId: selectedConnectorId || null,
  });

  // Determine which mode we're in
  const isConnectorMode = !selectedIntegrationKey && !!selectedConnectorId;

  // Use the appropriate connection based on mode
  const connection = isConnectorMode ? connectorConnection : integrationConnection;
  const isConnectionLoading = isConnectorMode ? isConnectorConnectionLoading : isIntegrationConnectionLoading;
  const isConnecting = isConnectorMode ? isConnectorConnecting : isIntegrationConnecting;
  const connect = isConnectorMode ? connectConnector : connectIntegration;

  const isConnected = !!connection;
  const connectionId = connection?.id;

  // Display info for connector mode
  const displayName = isConnectorMode ? selectedConnectorName : selectedIntegration?.name;
  const displayLogoUri = isConnectorMode ? selectedConnectorLogoUri : selectedIntegration?.logoUri;

  // Notify parent component about connection state changes
  React.useEffect(() => {
    onConnectionStateChange?.(isConnected, connectionId);
  }, [isConnected, connectionId, onConnectionStateChange]);

  const handleConnect = async () => {
    await connect();
    // After connecting, the connection state will be updated via useEffect
    // The connectionId will be passed via onConnectionStateChange
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* App Selection Section */}
      {
        <>
          {showLabel && <Label required>{label}</Label>}

          <Select
            value={
              selectedIntegrationKey ||
              (selectedConnectorId
                ? `connector:${selectedConnectorId}:${selectedConnectorName || ''}:${selectedConnectorLogoUri || ''}`
                : '')
            }
            onValueChange={(value) => {
              if (value === 'add-new-app') {
                setAddAppDialogOpen(true);
              } else if (value.startsWith('connector:')) {
                // Parse connector selection: "connector:{connectorId}:{name}:{logoUri}"
                const parts = value.split(':');
                const connectorId = parts[1];
                const connectorName = parts[2] || undefined;
                const connectorLogoUri = parts.slice(3).join(':') || undefined; // logoUri may contain colons
                onConnectorChange?.(connectorId, connectorName, connectorLogoUri);
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
              ) : selectedConnectorId ? (
                <div className="flex items-center gap-2">
                  {selectedConnectorLogoUri ? (
                    <Image
                      width={20}
                      height={20}
                      src={selectedConnectorLogoUri}
                      alt={`${selectedConnectorName} logo`}
                      className="w-5 h-5 rounded"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-xs font-medium text-muted-foreground">
                      {(selectedConnectorName || 'C')[0]}
                    </div>
                  )}
                  <span className="text-sm">{selectedConnectorName || 'Connected App'}</span>
                </div>
              ) : (
                <SelectValue placeholder="Select an app" />
              )}
            </SelectTrigger>
            <SelectContent>
              {/* Workspace-level integrations */}
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
              {/* Tenant-level connections (connections without integration) */}
              {connectorConnections.map((connection) => {
                // Find the connector info from tenantConnectors if available
                const connectorInfo = tenantConnectors.find((c) => c.id === connection.connectorId);
                const connectorName = connection.name || connectorInfo?.name || 'Connected App';
                const connectorLogoUri = connectorInfo?.logoUri || '';

                return (
                  <SelectItem
                    key={`connector:${connection.connectorId}`}
                    value={`connector:${connection.connectorId}:${connectorName}:${connectorLogoUri}`}
                  >
                    <div className="flex items-center gap-2">
                      {connectorLogoUri ? (
                        <Image
                          width={20}
                          height={20}
                          src={connectorLogoUri}
                          alt={`${connectorName} logo`}
                          className="w-5 h-5 rounded"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-xs font-medium text-muted-foreground">
                          {connectorName[0]}
                        </div>
                      )}
                      <span className="text-sm">{connectorName}</span>
                    </div>
                  </SelectItem>
                );
              })}
              {/* Tenant-level connectors without connections (created by agent but not yet connected) */}
              {unconnectedTenantConnectors.map((connector) => (
                <SelectItem
                  key={`connector:${connector.id}`}
                  value={`connector:${connector.id}:${connector.name}:${connector.logoUri || ''}`}
                >
                  <div className="flex items-center gap-2">
                    {connector.logoUri ? (
                      <Image
                        width={20}
                        height={20}
                        src={connector.logoUri}
                        alt={`${connector.name} logo`}
                        className="w-5 h-5 rounded"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-xs font-medium text-muted-foreground">
                        {connector.name[0]}
                      </div>
                    )}
                    <span className="text-sm">{connector.name}</span>
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
        </>
      }

      {/* Connection Status Section */}
      {(selectedIntegrationKey || selectedConnectorId) && (displayName || selectedIntegration) && (
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
                {displayLogoUri ? (
                  <Image
                    width={20}
                    height={20}
                    src={displayLogoUri}
                    alt={`${displayName} logo`}
                    className="w-5 h-5 rounded"
                  />
                ) : (
                  <div className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {displayName?.[0] || '?'}
                  </div>
                )}
                <span className="text-sm font-medium text-foreground">Connected to {displayName}</span>
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
                {displayLogoUri ? (
                  <Image
                    width={20}
                    height={20}
                    src={displayLogoUri}
                    alt={`${displayName} logo`}
                    className="w-5 h-5 rounded"
                  />
                ) : (
                  <div className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {displayName?.[0] || '?'}
                  </div>
                )}
                <span className="text-sm font-medium text-foreground">Connect {displayName}</span>
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
          if (type === 'action') {
            if (config?.integrationKey) {
              // Integration-based selection
              onIntegrationChange(config.integrationKey as string);
              onAddAppIntegration?.(config.integrationKey as string);
            } else if (config?.connectorId) {
              // Connector-based selection (tenant-level)
              onConnectorChange?.(
                config.connectorId as string,
                config.connectorName as string | undefined,
                config.connectorLogoUri as string | undefined,
              );
            }
          }
          setAddAppDialogOpen(false);
        }}
        initialViewMode="search"
        onOpenMembraneAgent={onOpenMembraneAgent}
      />
    </div>
  );
}
