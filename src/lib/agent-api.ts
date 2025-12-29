'use client';

import { getWorkspaceHeaders } from './workspace-storage';

/**
 * Get headers for agent API calls including auth and workspace credentials.
 */
export function getAgentHeaders(customerId: string, customerName: string | null | undefined): HeadersInit {
  const workspaceHeaders = getWorkspaceHeaders();

  return {
    'Content-Type': 'application/json',
    'x-auth-id': customerId,
    'x-customer-name': customerName || '',
    ...workspaceHeaders,
  };
}

/**
 * Fetch wrapper for agent API calls that includes auth headers.
 */
export async function agentFetch(
  url: string,
  customerId: string,
  customerName: string | null | undefined,
  options: RequestInit = {},
): Promise<Response> {
  const headers = {
    ...getAgentHeaders(customerId, customerName),
    ...(options.headers || {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Get SSE stream URL with credentials in query params (EventSource doesn't support headers).
 */
export function getStreamUrl(
  sessionId: string,
  customerId: string,
  workspaceKey: string,
  workspaceSecret: string,
): string {
  const params = new URLSearchParams({
    customerId,
    workspaceKey,
    workspaceSecret,
  });
  return `/api/sessions/${sessionId}/stream?${params.toString()}`;
}
