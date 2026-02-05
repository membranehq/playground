/**
 * Membrane Agent API Helper
 *
 * Provides functions to fetch Membrane Agent session data.
 * Uses long polling on session status endpoint to detect state changes.
 */

import { getWorkspaceHeaders } from './workspace-storage';

export interface MembraneAgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parts?: any[];
}

export interface MembraneAgentSessionStatus {
  status: 'idle' | 'busy';
}

export interface MembraneAgentMessagesResponse {
  messages: MembraneAgentMessage[];
}

interface LongPollOptions {
  wait?: number;
  timeout?: number;
}

function getCustomerHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  // Use activeCustomerId as primary source (matches CustomerProvider logic)
  const activeCustomerIdRaw = localStorage.getItem('activeCustomerId');
  const activeCustomerId = activeCustomerIdRaw ? (JSON.parse(activeCustomerIdRaw) as string | undefined) : undefined;

  // Fall back to userEmail for backwards compatibility
  const userEmailRaw = localStorage.getItem('userEmail');
  const userEmail = userEmailRaw ? (JSON.parse(userEmailRaw) as string | undefined) : undefined;

  const customerId = activeCustomerId || userEmail;
  if (!customerId) return {};

  return {
    'x-auth-id': customerId,
    'x-customer-name': customerId,
  };
}

// Get all auth headers for API calls
function getAuthHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...getCustomerHeaders(),
    ...getWorkspaceHeaders(),
  };
}

// Cache the token to avoid fetching it on every poll
// Include customerId to invalidate cache when customer changes
let cachedToken: { token: string; apiUri: string; expiresAt: number; customerId: string } | null = null;

function getCurrentCustomerId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const activeCustomerIdRaw = localStorage.getItem('activeCustomerId');
  const activeCustomerId = activeCustomerIdRaw ? (JSON.parse(activeCustomerIdRaw) as string | undefined) : undefined;
  const userEmailRaw = localStorage.getItem('userEmail');
  const userEmail = userEmailRaw ? (JSON.parse(userEmailRaw) as string | undefined) : undefined;
  return activeCustomerId || userEmail;
}

async function getMembraneConfig(): Promise<{ token: string; apiUri: string }> {
  const currentCustomerId = getCurrentCustomerId();

  // Return cached token if still valid (with 5 minute buffer) AND customer hasn't changed
  if (
    cachedToken &&
    cachedToken.expiresAt > Date.now() + 5 * 60 * 1000 &&
    cachedToken.customerId === currentCustomerId
  ) {
    return { token: cachedToken.token, apiUri: cachedToken.apiUri };
  }

  const response = await fetch('/api/membrane-config', {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to get Membrane config: ${response.status}`);
  }

  const config = await response.json();

  // Cache for 23 hours (token is valid for 24 hours)
  cachedToken = {
    token: config.token,
    apiUri: config.apiUri,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000,
    customerId: currentCustomerId || '',
  };

  return { token: config.token, apiUri: config.apiUri };
}

/**
 * Fetch session status with optional long polling.
 * Use wait/timeout params to wait for status changes.
 *
 * @param sessionId - The Membrane Agent session ID
 * @param options - Optional long polling parameters (wait=1, timeout=50 recommended)
 * @returns Promise with session status (idle or busy)
 */
export async function fetchMembraneAgentStatus(
  sessionId: string,
  options?: LongPollOptions,
): Promise<MembraneAgentSessionStatus> {
  const { token, apiUri } = await getMembraneConfig();

  // Build URL with long polling params for status endpoint
  const url = new URL(`${apiUri}/agent/sessions/${sessionId}`);
  if (options?.wait !== undefined) {
    url.searchParams.set('wait', String(options.wait));
  }
  if (options?.timeout !== undefined) {
    url.searchParams.set('timeout', String(options.timeout));
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Membrane Agent status: ${response.status}`);
  }

  const data = await response.json();

  return {
    status: data.state === 'idle' ? 'idle' : 'busy',
  };
}

/**
 * Fetch messages from a Membrane Agent session.
 * This does NOT use long polling - call it when you need to refresh messages.
 *
 * @param sessionId - The Membrane Agent session ID
 * @returns Promise with messages array
 */
export async function fetchMembraneAgentMessages(sessionId: string): Promise<MembraneAgentMessagesResponse> {
  const { token, apiUri } = await getMembraneConfig();

  // DEBUG: Log token info for message fetch
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]));
      console.log('[fetchMembraneAgentMessages] DEBUG - Token payload for fetching messages:', {
        id: payload.id,
        name: payload.name,
        isAdmin: payload.isAdmin,
        iss: payload.iss,
      });
    }
  } catch (e) {
    console.log('[fetchMembraneAgentMessages] DEBUG - Could not decode token');
  }

  const url = new URL(`${apiUri}/agent/sessions/${sessionId}/messages`);
  console.log('[fetchMembraneAgentMessages] DEBUG - Fetching messages from:', url.toString());

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[fetchMembraneAgentMessages] DEBUG - Error response:', {
      status: response.status,
      body: errorText,
    });
    throw new Error(`Failed to fetch Membrane Agent messages: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // API returns array directly, not { items: [...] }
  const items = Array.isArray(data) ? data : data.items || [];

  // Transform messages to our expected format
  const messages: MembraneAgentMessage[] = items.map((msg: any) => {
    // Extract text content from parts
    const textParts = msg.parts?.filter((p: any) => p.type === 'text') || [];
    const content = textParts.map((p: any) => p.text).join('');

    return {
      id: msg.info?.id || msg.id,
      role: msg.info?.role || msg.role,
      content,
      parts: msg.parts,
    };
  });

  return { messages };
}

/**
 * Create a new Membrane Agent session.
 *
 * @param initialMessage - Optional initial message to send to the session
 * @returns Promise with the created session ID
 */
export async function createMembraneAgentSession(initialMessage?: string): Promise<string> {
  const { token, apiUri } = await getMembraneConfig();

  const url = new URL(`${apiUri}/agent/sessions`);

  const body: any = {};
  if (initialMessage) {
    body.prompt = initialMessage;
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to create Membrane Agent session: ${response.status}`);
  }

  const data = await response.json();

  // The API should return the session ID
  return data.id || data.sessionId;
}

/**
 * Clear the cached token (useful for logout or error recovery)
 */
export function clearMembraneTokenCache(): void {
  cachedToken = null;
}
