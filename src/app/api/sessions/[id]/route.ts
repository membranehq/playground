import { NextRequest, NextResponse } from 'next/server';
import { getAgentAuthFromRequest } from '@/lib/agent-auth';
import { opencodeService } from '@/lib/opencode-service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get auth info from headers
    const auth = getAgentAuthFromRequest(request);

    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: sessionId } = await params;

    console.log(`[Delete Session API] Deleting session: ${sessionId}`);

    await opencodeService.deleteSession(
      auth.customerId,
      sessionId,
      auth.workspaceCredentials
    );

    console.log(`[Delete Session API] Session deleted successfully`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Delete Session API] Error deleting session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete session' },
      { status: 500 }
    );
  }
}
