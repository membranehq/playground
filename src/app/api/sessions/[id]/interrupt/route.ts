import { NextRequest, NextResponse } from 'next/server';
import { getAgentAuthFromRequest } from '@/lib/agent-auth';
import { opencodeService } from '@/lib/opencode-service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Get auth info from headers
    const auth = getAgentAuthFromRequest(request);

    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: sessionId } = await params;

    console.log(`[Interrupt API] Aborting session: ${sessionId}`);

    await opencodeService.abortSession(auth.customerId, sessionId, auth.workspaceCredentials);

    console.log(`[Interrupt API] Session aborted successfully`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Interrupt API] Error aborting session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to abort session' },
      { status: 500 },
    );
  }
}
