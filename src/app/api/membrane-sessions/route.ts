import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticationFromRequest } from '@/lib/auth';
import { generateIntegrationToken } from '@/lib/integration-token';

/**
 * POST /api/membrane-sessions
 * Create a new Membrane Agent session
 */
export async function POST(request: NextRequest) {
  console.log('[Membrane Sessions API] POST /api/membrane-sessions - creating Membrane agent session');

  try {
    const auth = getAuthenticationFromRequest(request);

    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse request body for optional initial message
    const body = await request.json().catch(() => ({}));
    const initialMessage = body.message as string | undefined;

    // Get Membrane API config
    const apiUri = process.env.NEXT_PUBLIC_INTEGRATION_APP_API_URL || 'https://api.integration.app';
    const token = await generateIntegrationToken(auth);

    // Create Membrane agent session
    const url = new URL(`${apiUri}/agent/sessions`);

    const requestBody: any = {};
    if (initialMessage) {
      requestBody.prompt = initialMessage;
    }

    console.log('[Membrane Sessions API] Creating session with initial message:', initialMessage ? 'yes' : 'no');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Membrane Sessions API] Failed to create session:', response.status, errorText);
      throw new Error(`Failed to create Membrane Agent session: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const sessionId = data.id || data.sessionId;

    console.log('[Membrane Sessions API] Created session:', sessionId);

    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error('[Membrane Sessions API] Error creating session:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create Membrane agent session',
      },
      { status: 500 },
    );
  }
}

