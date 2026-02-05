import { useState, useEffect, useCallback } from 'react';
import { useIntegrationApp } from '@membranehq/react';
import { Connection } from '@membranehq/sdk';

interface UseConnectorConnectionProps {
  connectorId: string | null;
}

interface UseConnectorConnectionReturn {
  data: Connection | null;
  isLoading: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
}

export function useConnectorConnection({
  connectorId,
}: UseConnectorConnectionProps): UseConnectorConnectionReturn {
  const [data, setData] = useState<Connection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const integrationApp = useIntegrationApp();

  const fetchConnection = useCallback(async () => {
    if (!connectorId) {
      setData(null);
      return;
    }

    setIsLoading(true);
    try {
      // Find connections for this connector
      const connections = await integrationApp.connections.find({
        connectorId,
      });
      if (connections.items.length > 0) {
        setData(connections.items[0]);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error('Failed to fetch connector connection:', err);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [connectorId, integrationApp]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  const connect = async () => {
    if (!connectorId) return;

    setIsConnecting(true);
    try {
      // Use ui.connect with connectorId for tenant-level connections
      const connection = await integrationApp.ui.connect({ connectorId });
      if (connection) {
        setData(connection);
      }
      // Refresh connection data
      await fetchConnection();
    } catch (err) {
      console.error('Failed to connect:', err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  return {
    data,
    isLoading,
    isConnecting,
    connect,
  };
}
