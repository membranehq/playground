'use client';

import { useState, useEffect, useCallback } from 'react';
import { Connectible } from '@/types/connectible';
import { getWorkspaceHeaders } from '@/lib/workspace-storage';
import { useCustomer } from '@/components/providers/customer-provider';

interface UseConnectiblesOptions {
  search?: string;
  enabled?: boolean;
}

interface UseConnectiblesResult {
  connectibles: Connectible[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useConnectibles(options: UseConnectiblesOptions = {}): UseConnectiblesResult {
  const { search = '', enabled = true } = options;
  const [connectibles, setConnectibles] = useState<Connectible[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const customer = useCustomer();

  const fetchConnectibles = useCallback(async () => {
    // Don't fetch if disabled or no search query
    if (!enabled || !search.trim()) {
      setConnectibles([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('q', search);

      const workspaceHeaders = getWorkspaceHeaders();
      const response = await fetch(`/api/connectibles/search?${params.toString()}`, {
        headers: {
          ...workspaceHeaders,
          'x-auth-id': customer?.customerId ?? '',
          'x-customer-name': customer?.customerName ?? '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch connectibles');
      }

      const data = await response.json();
      setConnectibles(data.connectibles || []);
    } catch (err) {
      console.error('Failed to fetch connectibles:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch connectibles'));
      setConnectibles([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, enabled, customer?.customerId, customer?.customerName]);

  useEffect(() => {
    fetchConnectibles();
  }, [fetchConnectibles]);

  return {
    connectibles,
    isLoading,
    error,
    refetch: fetchConnectibles,
  };
}
