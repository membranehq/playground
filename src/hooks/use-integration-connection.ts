import { useState, useEffect, useCallback } from 'react';
import { useIntegrationApp } from '@membranehq/react';
import { Connection } from '@membranehq/sdk';

interface UseIntegrationConnectionProps {
  integrationKey: string | null;
}

interface UseIntegrationConnectionReturn {
  data: Connection | null;
  isLoading: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
}

export function useIntegrationConnection({
  integrationKey,
}: UseIntegrationConnectionProps): UseIntegrationConnectionReturn {
  const [data, setData] = useState<Connection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const integrationApp = useIntegrationApp();

  const fetchConnection = useCallback(async () => {
    if (!integrationKey) {
      setData(null);
      return;
    }

    setIsLoading(true);
    try {
      const connection = await integrationApp.connections.find({
        integrationKey,
      });
      if (connection.items.length > 0) {
        setData(connection.items[0]);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error('Failed to fetch connection:', err);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [integrationKey, integrationApp]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  const connect = async () => {
    if (!integrationKey) return;

    setIsConnecting(true);
    try {
      await integrationApp.integration(integrationKey).openNewConnection();
      setIsLoading(true);
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


