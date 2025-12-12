'use client';

import { useEffect, useState, useRef } from 'react';
import { fetchMembraneAgentStatus } from '@/lib/membrane-agent-api';

type SessionState = 'busy' | 'idle' | 'error';

interface UseMembraneSessionStatusResult {
  state: SessionState;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch and poll Membrane Agent session status.
 * Polls with long polling while busy, stops when idle.
 */
export function useMembraneSessionStatus(sessionId: string | null): UseMembraneSessionStatusResult {
  const [state, setState] = useState<SessionState>('busy');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);

  // Keep ref in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const currentSessionId = sessionId; // Capture for closure

    async function pollStatus() {
      // Initial fetch without long polling
      try {
        const statusResponse = await fetchMembraneAgentStatus(currentSessionId);
        if (cancelled) return;

        setIsLoading(false);
        setState(statusResponse.status);

        if (statusResponse.status === 'idle') {
          return;
        }
      } catch (err) {
        if (cancelled) return;
        console.error('[useMembraneSessionStatus] Error fetching initial status:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
        setIsLoading(false);
        return;
      }

      // Poll while busy
      while (!cancelled && stateRef.current === 'busy') {
        try {
          const statusResponse = await fetchMembraneAgentStatus(currentSessionId, {
            wait: 1,
            timeout: 50,
          });

          if (cancelled) break;

          if (statusResponse.status === 'idle') {
            setState('idle');
            break;
          }
        } catch (err) {
          if (cancelled) break;
          console.error('[useMembraneSessionStatus] Error polling status:', err);
          // Continue polling on error
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    }

    pollStatus();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return { state, isLoading, error };
}
