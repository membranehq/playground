'use client';

import { useState } from 'react';
import { useIntegrationApp } from '@membranehq/react';

interface ConnectionRequestProps {
  integrationKey: string;
  onConnect?: (connectionId: string) => void;
}

export function ConnectionRequest({ integrationKey, onConnect }: ConnectionRequestProps) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const integrationApp = useIntegrationApp();

  const handleConnect = async () => {
    setConnecting(true);

    try {
      // Open the Integration.app connection UI
      const connection = await integrationApp.integration(integrationKey).openNewConnection();

      if (connection) {
        setConnectionId(connection.id);
        setConnected(true);
        onConnect?.(connection.id);
      }
    } catch (error) {
      console.error('Failed to create connection:', error);
    } finally {
      setConnecting(false);
    }
  };

  if (connected && connectionId) {
    return (
      <div className="border border-green-800 bg-green-900/20 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <div>
            <div className="text-sm font-medium text-green-100">Connected to {integrationKey}</div>
            <div className="text-xs text-green-300 mt-1">Connection ID: {connectionId}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border bg-card rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-foreground">Test Connection Required</div>
          <div className="text-sm text-muted-foreground mt-1">Connect your {integrationKey} account to continue</div>
        </div>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {connecting ? 'Connecting...' : 'Connect'}
        </button>
      </div>
    </div>
  );
}
