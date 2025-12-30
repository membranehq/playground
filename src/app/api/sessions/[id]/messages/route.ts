import { NextRequest, NextResponse } from 'next/server';
import { getAgentAuthFromRequest } from '@/lib/agent-auth';
import { opencodeService } from '@/lib/opencode-service';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  console.log(`[Messages API] GET /api/sessions/${sessionId}/messages`);

  try {
    // Get auth info from headers
    const auth = getAgentAuthFromRequest(request);

    console.log('[Messages API] Customer ID:', auth?.customerId);

    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log(`[Messages API] Calling opencodeService.getMessages for session ${sessionId}...`);
    const response = await opencodeService.getMessages(auth.customerId, sessionId, auth.workspaceCredentials);
    console.log('[Messages API] Response:', JSON.stringify(response).slice(0, 500));

    if (response.error) {
      console.error('[Messages API] Response contains error:', response.error);
      return NextResponse.json({ error: 'Failed to fetch messages', details: response.error }, { status: 500 });
    }

    if (!response.data) {
      console.log('[Messages API] No data in response, returning empty array');
      return NextResponse.json({ messages: [] });
    }

    // Transform messages to include all parts for the frontend
    const messages = response.data.map((msg: any) => {
      // Extract text from parts
      const textParts = msg.parts.filter((part: any) => part.type === 'text');
      const content = textParts.map((part: any) => part.text).join('');

      return {
        id: msg.info.id,
        role: msg.info.role,
        content,
        parts: msg.parts, // Send all parts to frontend
      };
    });

    console.log('[Messages API] Returning', messages.length, 'messages');
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('[Messages API] Error fetching messages:', error);
    console.error('[Messages API] Error stack:', error instanceof Error ? error.stack : 'no stack');
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
