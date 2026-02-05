'use client';

import { useState, useEffect, useCallback } from 'react';
import { useIntegrationApp } from '@membranehq/react';

interface Connector {
  id: string;
  key: string;
  name: string;
  logoUri?: string;
  isPublic?: boolean;
  tenantId?: string;
}

interface UseConnectorsOptions {
  /**
   * If true, only fetch tenant-level connectors (non-public)
   */
  tenantOnly?: boolean;
  enabled?: boolean;
}

interface UseConnectorsResult {
  connectors: Connector[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useConnectors(options: UseConnectorsOptions = {}): UseConnectorsResult {
  const { tenantOnly = false, enabled = true } = options;
  const integrationApp = useIntegrationApp();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchConnectors = useCallback(async () => {
    if (!enabled || !integrationApp) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await integrationApp.get('connectors', {
        limit: 100,
      });

      let items: Connector[] = response.items || [];

      // Filter to tenant-level connectors only (non-public)
      if (tenantOnly) {
        items = items.filter((connector: Connector) => !connector.isPublic);
      }

      setConnectors(items);
    } catch (err) {
      console.error('Failed to fetch connectors:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch connectors'));
      setConnectors([]);
    } finally {
      setIsLoading(false);
    }
  }, [integrationApp, tenantOnly, enabled]);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  return {
    connectors,
    isLoading,
    error,
    refetch: fetchConnectors,
  };
}
