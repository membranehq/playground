import { NextRequest, NextResponse } from 'next/server';
import { opencodeService, WorkspaceCredentials } from '@/lib/opencode-service';

// URL of the OpenCode proxy server
function getOpencodeServerUrl(): string {
  if (process.env.OPENCODE_SERVER_URL) {
    return process.env.OPENCODE_SERVER_URL;
  }
  const host = process.env.OPENCODE_SERVER_HOST || 'localhost';
  const port = process.env.OPENCODE_SERVER_PORT || '1337';
  return `http://${host}:${port}`;
}

const OPENCODE_SERVER_URL = getOpencodeServerUrl();

// Store controllers per session per customer
// Key format: `${customerId}:${sessionId}`
const sessionControllers = new Map<string, Set<ReadableStreamDefaultController>>();

// Per-customer event streams
// Key: customerId
const customerEventStreams = new Map<
  string,
  {
    reader: ReadableStreamDefaultReader<Uint8Array>;
    isProcessing: boolean;
    credentials: WorkspaceCredentials;
  }
>();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Get auth info from query params (EventSource doesn't support headers)
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  const workspaceKey = searchParams.get('workspaceKey');
  const workspaceSecret = searchParams.get('workspaceSecret');

  if (!customerId || !workspaceKey || !workspaceSecret) {
    return NextResponse.json(
      { error: 'Authentication required (customerId, workspaceKey, workspaceSecret query params)' },
      { status: 401 },
    );
  }

  const credentials: WorkspaceCredentials = { workspaceKey, workspaceSecret };

  const { id: sessionId } = await params;
  const sessionKey = `${customerId}:${sessionId}`;

  console.log(`[Stream API] Client connected: customer=${customerId}, session=${sessionId}`);

  // Create SSE stream
  const encoder = new TextEncoder();
  let currentController: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      currentController = controller;

      try {
        // Get or create controller set for this session
        let controllers = sessionControllers.get(sessionKey);
        if (!controllers) {
          controllers = new Set();
          sessionControllers.set(sessionKey, controllers);
          console.log(`[Stream API] Created controller set for session: ${sessionKey}`);
        }

        // Add this controller to the set
        controllers.add(controller);

        // Send initial connection message
        const connectMsg = `data: ${JSON.stringify({ type: 'connected', sessionId, customerId })}\n\n`;
        controller.enqueue(encoder.encode(connectMsg));

        console.log(`[Stream API] Client added to session ${sessionKey} (${controllers.size} active clients)`);

        // Start event stream for this customer if not already started
        await startCustomerEventStream(customerId, credentials);
      } catch (error) {
        console.error('[Stream API] Error starting stream:', error);
        controller.error(error);
      }
    },

    cancel() {
      console.log(`[Stream API] Client disconnected: ${sessionKey}`);
      if (currentController) {
        const controllers = sessionControllers.get(sessionKey);
        if (controllers) {
          controllers.delete(currentController);
          console.log(`[Stream API] Removed controller from session ${sessionKey} (${controllers.size} remaining)`);

          // If no more clients for this session, clean up after a delay
          if (controllers.size === 0) {
            setTimeout(() => {
              const ctrl = sessionControllers.get(sessionKey);
              if (ctrl && ctrl.size === 0) {
                console.log(`[Stream API] No more clients, cleaning up session: ${sessionKey}`);
                sessionControllers.delete(sessionKey);
              }
            }, 5000);
          }
        }
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

async function startCustomerEventStream(customerId: string, credentials: WorkspaceCredentials) {
  // Check if we already have an active stream for this customer
  const existing = customerEventStreams.get(customerId);
  if (existing && existing.isProcessing) {
    console.log(`[Stream API] Event stream already active for customer: ${customerId}`);
    return;
  }

  console.log(`[Stream API] Starting event stream for customer: ${customerId}`);

  try {
    // Subscribe to events for this customer (pass credentials via query params)
    const eventUrl = opencodeService.getEventSubscribeUrl(customerId, credentials);
    const response = await fetch(eventUrl);

    if (!response.ok || !response.body) {
      throw new Error(`Failed to subscribe to events: ${response.status}`);
    }

    const reader = response.body.getReader();
    customerEventStreams.set(customerId, { reader, isProcessing: true, credentials });

    // Process events in background
    processCustomerEvents(customerId, reader);
  } catch (error) {
    console.error(`[Stream API] Failed to start event stream for ${customerId}:`, error);
    customerEventStreams.delete(customerId);
  }
}

async function processCustomerEvents(customerId: string, reader: ReadableStreamDefaultReader<Uint8Array>) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    console.log(`[Stream API] Processing events for customer: ${customerId}`);

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log(`[Stream API] Event stream ended for customer: ${customerId}`);
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        try {
          const event = JSON.parse(line.slice(6));

          // Filter out non-critical errors:
          // 1. Auth errors from OpenCode cloud service (401)
          // 2. MessageAbortedError from auto-interrupt plugin (expected when interactive tools are used)
          const errorName = event.error?.name;
          const statusCode = event.error?.data?.statusCode;

          if (
            errorName === 'APIError' &&
            (statusCode === 401 || statusCode === '401' || statusCode === 'unauthorized')
          ) {
            console.log(`[Stream API] Filtering out cloud auth error for session ${event.sessionID}`);
            continue;
          }

          if (errorName === 'MessageAbortedError') {
            console.log(
              `[Stream API] Filtering out MessageAbortedError for session ${event.sessionID} (expected from auto-interrupt plugin)`,
            );
            continue;
          }

          // Log any other errors for debugging
          if (event.error) {
            console.log(`[Stream API] Event has error (not filtered):`, JSON.stringify(event.error));
          }

          // Extract session ID from event
          const eventSessionId =
            event.sessionID ||
            event.properties?.info?.sessionID ||
            event.properties?.part?.sessionID ||
            event.properties?.sessionID;

          if (!eventSessionId) continue;

          // Find controllers for this customer+session
          const sessionKey = `${customerId}:${eventSessionId}`;
          const controllers = sessionControllers.get(sessionKey);

          if (!controllers || controllers.size === 0) continue;

          console.log(`[Stream API] Sending event to ${controllers.size} client(s) for ${sessionKey}`);

          // Send event to all connected clients
          const eventData = `data: ${JSON.stringify({ type: 'event', event })}\n\n`;
          const deadControllers = new Set<ReadableStreamDefaultController>();

          for (const controller of controllers) {
            try {
              controller.enqueue(encoder.encode(eventData));
            } catch (error) {
              deadControllers.add(controller);
            }
          }

          // Remove dead controllers
          deadControllers.forEach((ctrl) => controllers.delete(ctrl));

          // Handle special events
          if (event.type === 'session.idle') {
            const idleMsg = `data: ${JSON.stringify({ type: 'idle' })}\n\n`;
            for (const controller of controllers) {
              try {
                controller.enqueue(encoder.encode(idleMsg));
              } catch (error) {
                // Ignore errors
              }
            }
          }

          if (event.type === 'session.error') {
            // Check if this is a MessageAbortedError (expected from auto-interrupt plugin)
            const errorName = event.properties?.error?.name || event.properties?.name;
            if (errorName === 'MessageAbortedError') {
              console.log(`[Stream API] Filtering out session.error MessageAbortedError for session ${eventSessionId}`);
              continue;
            }

            const errorMsg = `data: ${JSON.stringify({ type: 'error', error: event.properties })}\n\n`;
            for (const controller of controllers) {
              try {
                controller.enqueue(encoder.encode(errorMsg));
              } catch (error) {
                // Ignore errors
              }
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  } catch (error) {
    console.error(`[Stream API] Error processing events for ${customerId}:`, error);
  } finally {
    // Clean up
    const streamInfo = customerEventStreams.get(customerId);
    if (streamInfo) {
      streamInfo.isProcessing = false;
    }
    customerEventStreams.delete(customerId);
    console.log(`[Stream API] Cleaned up event stream for customer: ${customerId}`);
  }
}
