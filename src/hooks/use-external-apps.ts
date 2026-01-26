'use client';

import { useState, useEffect, useCallback } from 'react';
import { useIntegrationApp } from '@membranehq/react';
import type { App } from '@membranehq/sdk';

interface UseExternalAppsOptions {
  search?: string;
  limit?: number;
  enabled?: boolean;
}

interface UseExternalAppsResult {
  apps: App[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useExternalApps(options: UseExternalAppsOptions = {}): UseExternalAppsResult {
  const { search = '', limit = 50, enabled = true } = options;
  const integrationApp = useIntegrationApp();
  const [apps, setApps] = useState<App[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchApps = useCallback(async () => {
    if (!enabled || !integrationApp) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await integrationApp.get('external-apps', {
        search: search || undefined,
        limit,
      });
      setApps(response.items || []);
    } catch (err) {
      console.error('Failed to fetch external apps:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch external apps'));
      setApps([]);
    } finally {
      setIsLoading(false);
    }
  }, [integrationApp, search, limit, enabled]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  return {
    apps,
    isLoading,
    error,
    refetch: fetchApps,
  };
}
