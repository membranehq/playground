import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/server-auth';
import {
  generateIntegrationToken,
  IntegrationTokenError,
} from '@/lib/integration-token';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);

    if (!auth.customerId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get URIs
    const apiUri = process.env.NEXT_PUBLIC_INTEGRATION_APP_API_URL || 'https://api.integration.app';
    const uiUri = process.env.NEXT_PUBLIC_INTEGRATION_APP_UI_URL || 'https://ui.integration.app';

    // Generate JWT token using the same function as integration-token
    const token = await generateIntegrationToken(auth);

    return NextResponse.json({ apiUri, uiUri, token });
  } catch (error) {
    console.error('[Membrane Config] Error generating config:', error);
    if (error instanceof IntegrationTokenError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Failed to generate config' },
      { status: 500 }
    );
  }
}
