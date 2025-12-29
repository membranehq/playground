/**
 * OpenCode Service - Thin client for the multi-tenant proxy server
 *
 * This service connects to the OpenCode proxy server and routes all requests
 * through it with the customer ID prefix.
 *
 * IMPORTANT: Workspace credentials (workspaceKey, workspaceSecret) are passed
 * via request headers from the frontend, NOT from environment variables.
 */

import { opencodeLogger } from './opencode-logger';

// URL of the OpenCode proxy server
// Local dev: http://localhost:1337
// Production: set via OPENCODE_SERVER_URL or OPENCODE_SERVER_HOST + OPENCODE_SERVER_PORT
function getOpencodeServerUrl(): string {
  if (process.env.OPENCODE_SERVER_URL) {
    return process.env.OPENCODE_SERVER_URL;
  }
  // Fallback: combine host and port (for Render private services)
  const host = process.env.OPENCODE_SERVER_HOST || 'localhost';
  const port = process.env.OPENCODE_SERVER_PORT || '1337';
  return `http://${host}:${port}`;
}

const OPENCODE_SERVER_URL = getOpencodeServerUrl();

export interface WorkspaceCredentials {
  workspaceKey: string;
  workspaceSecret: string;
}

class OpencodeService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = OPENCODE_SERVER_URL;
    console.log(`[OpencodeService] Using proxy server at: ${this.baseUrl}`);
  }

  /**
   * Create headers with workspace credentials
   */
  private createHeaders(credentials: WorkspaceCredentials): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-workspace-key': credentials.workspaceKey,
      'x-workspace-secret': credentials.workspaceSecret,
    };
  }

  /**
   * Create a new session for a customer.
   */
  async createSession(customerId: string, credentials: WorkspaceCredentials): Promise<string> {
    console.log(`[OpencodeService] Creating session for customer: ${customerId}`);

    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(customerId)}/session.create`, {
      method: 'POST',
      headers: this.createHeaders(credentials),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create session: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(`Failed to create session: ${JSON.stringify(result.error)}`);
    }

    const sessionId = result.data?.id;
    if (!sessionId) {
      throw new Error(`No session ID in response: ${JSON.stringify(result)}`);
    }

    console.log(`[OpencodeService] Created session: ${sessionId}`);

    // Try to get share URL
    try {
      const shareResponse = await fetch(`${this.baseUrl}/${encodeURIComponent(customerId)}/session.share`, {
        method: 'POST',
        headers: this.createHeaders(credentials),
        body: JSON.stringify({ id: sessionId }),
      });

      if (shareResponse.ok) {
        const shareResult = await shareResponse.json();
        const shareUrl = shareResult.data?.share?.url;
        if (shareUrl) {
          console.log(`[OpencodeService] Share URL: ${shareUrl}`);
        }
      }
    } catch (shareError) {
      console.log(`[OpencodeService] Share URL not available`);
    }

    return sessionId;
  }

  /**
   * Send a prompt to a session.
   */
  async sendPrompt(
    customerId: string,
    sessionId: string,
    message: string,
    credentials: WorkspaceCredentials,
  ): Promise<any> {
    console.log(`[OpencodeService] Sending prompt to session ${sessionId}: "${message.substring(0, 50)}..."`);

    // Log the request
    opencodeLogger.logRequest(sessionId, message);

    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(customerId)}/session.prompt`, {
      method: 'POST',
      headers: this.createHeaders(credentials),
      body: JSON.stringify({
        id: sessionId,
        parts: [{ type: 'text', text: message }],
        agent: 'self-integration',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`Failed to send prompt: ${response.status} ${errorText}`);
      opencodeLogger.logError(`Failed to send prompt to session ${sessionId}`, error);
      throw error;
    }

    const result = await response.json();

    // Log the response
    opencodeLogger.logResponse(sessionId, result);

    console.log(`[OpencodeService] Received response from OpenCode`);

    return result;
  }

  /**
   * Get the SSE event subscription URL with credentials as query params.
   * (EventSource doesn't support custom headers)
   */
  getEventSubscribeUrl(customerId: string, credentials: WorkspaceCredentials): string {
    const params = new URLSearchParams({
      workspaceKey: credentials.workspaceKey,
      workspaceSecret: credentials.workspaceSecret,
    });
    return `${this.baseUrl}/${encodeURIComponent(customerId)}/event.subscribe?${params.toString()}`;
  }

  /**
   * Stream prompt response (subscribe to events, then send prompt).
   */
  async streamPrompt(
    customerId: string,
    sessionId: string,
    message: string,
    credentials: WorkspaceCredentials,
  ): Promise<AsyncIterableIterator<any>> {
    console.log(`[OpencodeService] Starting stream for session ${sessionId}: "${message.substring(0, 50)}..."`);

    // Start SSE subscription (with credentials in query params)
    const eventUrl = this.getEventSubscribeUrl(customerId, credentials);
    const eventResponse = await fetch(eventUrl);

    if (!eventResponse.ok || !eventResponse.body) {
      throw new Error(`Failed to subscribe to events: ${eventResponse.status}`);
    }

    // Send the prompt (fire and forget)
    fetch(`${this.baseUrl}/${encodeURIComponent(customerId)}/session.prompt`, {
      method: 'POST',
      headers: this.createHeaders(credentials),
      body: JSON.stringify({
        id: sessionId,
        parts: [{ type: 'text', text: message }],
        agent: 'self-integration',
      }),
    }).catch((error) => {
      console.error('[OpencodeService] Error in prompt:', error);
    });

    // Create an async iterator from the SSE stream
    const reader = eventResponse.body.getReader();
    const decoder = new TextDecoder();

    async function* streamIterator(): AsyncIterableIterator<any> {
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              yield data;
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    }

    return streamIterator();
  }

  /**
   * Get messages from a session.
   */
  async getMessages(customerId: string, sessionId: string, credentials: WorkspaceCredentials): Promise<any> {
    const url = `${this.baseUrl}/${encodeURIComponent(customerId)}/session.messages?id=${encodeURIComponent(sessionId)}`;
    console.log(`[OpencodeService] GET ${url}`);

    const response = await fetch(url, {
      headers: this.createHeaders(credentials),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OpencodeService] Error getting messages: ${response.status}`, errorText);
      throw new Error(`Failed to get messages: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log(`[OpencodeService] Got messages response:`, JSON.stringify(data).slice(0, 200));
    return data;
  }

  /**
   * List sessions for a customer.
   */
  async listSessions(customerId: string, credentials: WorkspaceCredentials): Promise<any> {
    const url = `${this.baseUrl}/${encodeURIComponent(customerId)}/session.list`;
    console.log(`[OpencodeService] GET ${url}`);

    const response = await fetch(url, {
      headers: this.createHeaders(credentials),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OpencodeService] Error listing sessions: ${response.status}`, errorText);
      throw new Error(`Failed to list sessions: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log(`[OpencodeService] Got sessions response:`, JSON.stringify(data).slice(0, 200));
    return data;
  }

  /**
   * Abort a session.
   */
  async abortSession(customerId: string, sessionId: string, credentials: WorkspaceCredentials): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(customerId)}/session.abort`, {
      method: 'POST',
      headers: this.createHeaders(credentials),
      body: JSON.stringify({ id: sessionId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to abort session: ${response.status} ${errorText}`);
    }
  }

  /**
   * Delete a session and all its data.
   */
  async deleteSession(customerId: string, sessionId: string, credentials: WorkspaceCredentials): Promise<void> {
    console.log(`[OpencodeService] Deleting session ${sessionId} for customer ${customerId}`);

    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(customerId)}/session.delete`, {
      method: 'POST',
      headers: this.createHeaders(credentials),
      body: JSON.stringify({ id: sessionId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete session: ${response.status} ${errorText}`);
    }

    console.log(`[OpencodeService] Deleted session ${sessionId}`);
  }

  /**
   * Get health status of the proxy server.
   */
  async getHealth(): Promise<{ status: string; activeInstances: number; customers: string[] }> {
    const response = await fetch(`${this.baseUrl}/health`);

    if (!response.ok) {
      throw new Error(`Proxy server health check failed: ${response.status}`);
    }

    return response.json();
  }
}

// Singleton instance
const globalForOpencode = globalThis as unknown as {
  opencodeService: OpencodeService | undefined;
};

export const opencodeService = globalForOpencode.opencodeService ?? new OpencodeService();
globalForOpencode.opencodeService = opencodeService;
