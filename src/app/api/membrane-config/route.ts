import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticationFromRequest } from '@/lib/auth';
import { generateIntegrationToken, IntegrationTokenError, decodeTokenForDebug } from '@/lib/integration-token';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthenticationFromRequest(request);

    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // DEBUG: Log auth details for membrane-config
    console.log('[Membrane Config API] DEBUG - Auth details:', {
      customerId: auth.customerId,
      customerName: auth.customerName,
      workspaceKey: auth.workspaceCredentials.workspaceKey,
    });

    // Get URIs
    const apiUri = process.env.NEXT_PUBLIC_INTEGRATION_APP_API_URL || 'https://api.integration.app';
    const uiUri = process.env.NEXT_PUBLIC_INTEGRATION_APP_UI_URL || 'https://ui.integration.app';

    // Generate JWT token using the same function as integration-token
    const token = await generateIntegrationToken(auth);

    // DEBUG: Log generated token payload
    const tokenDebug = decodeTokenForDebug(token);
    console.log('[Membrane Config API] DEBUG - Generated token payload:', tokenDebug);

    return NextResponse.json({ apiUri, uiUri, token });
  } catch (error) {
    console.error('[Membrane Config] Error generating config:', error);
    if (error instanceof IntegrationTokenError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to generate config' }, { status: 500 });
  }
}
