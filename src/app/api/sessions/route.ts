import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticationFromRequest } from '@/lib/auth';
import { opencodeService } from '@/lib/opencode-service';

export async function GET(request: NextRequest) {
  console.log('[Sessions API] GET /api/sessions - listing sessions');

  try {
    // Get auth info from headers
    const auth = getAuthenticationFromRequest(request);

    console.log({ agent: auth });

    console.log('[Sessions API] Customer ID:', auth?.customerId);

    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('[Sessions API] Calling opencodeService.listSessions...');
    const response = await opencodeService.listSessions(auth.customerId, auth.workspaceCredentials);
    console.log('[Sessions API] Response:', JSON.stringify(response).slice(0, 500));

    if (response.error) {
      console.error('[Sessions API] Response contains error:', response.error);
      return NextResponse.json({ error: 'Failed to list sessions', details: response.error }, { status: 500 });
    }

    if (!response.data) {
      console.log('[Sessions API] No data in response, returning empty array');
      return NextResponse.json({ sessions: [] });
    }

    // Sort by most recently updated
    const sessions = response.data.sort((a: any, b: any) => b.time.updated - a.time.updated);
    console.log('[Sessions API] Returning', sessions.length, 'sessions');

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('[Sessions API] Error listing sessions:', error);
    console.error('[Sessions API] Error stack:', error instanceof Error ? error.stack : 'no stack');
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('[Sessions API] POST /api/sessions - creating session');

  try {
    // Get auth info from headers
    const auth = getAuthenticationFromRequest(request);

    console.log('[Sessions API] Customer ID:', auth?.customerId);

    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('[Sessions API] Calling opencodeService.createSession...');
    const sessionId = await opencodeService.createSession(auth.customerId, auth.workspaceCredentials);
    console.log('[Sessions API] Created session:', sessionId);

    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error('[Sessions API] Error creating session:', error);
    console.error('[Sessions API] Error stack:', error instanceof Error ? error.stack : 'no stack');
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create session',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
