import { NextRequest, NextResponse } from 'next/server';
import { getAgentAuthFromRequest } from '@/lib/agent-auth';
import { opencodeService } from '@/lib/opencode-service';

export async function POST(request: NextRequest) {
  try {
    // Get auth info from headers
    const auth = getAgentAuthFromRequest(request);

    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required (x-auth-id, x-workspace-key, x-workspace-secret headers)' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { message, sessionId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid request: message string is required' }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Invalid request: sessionId is required' }, { status: 400 });
    }

    console.log(`[Chat API] Sending message to session ${sessionId}: "${message.substring(0, 50)}..."`);

    // Send the prompt (don't wait for response, that comes via SSE stream)
    await opencodeService.sendPrompt(auth.customerId, sessionId, message, auth.workspaceCredentials);

    console.log(`[Chat API] Message sent successfully`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Chat API] Error sending message:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const health = await opencodeService.getHealth();
    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Proxy server not available' }, { status: 500 });
  }
}
