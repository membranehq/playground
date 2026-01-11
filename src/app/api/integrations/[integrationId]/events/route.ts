import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticationFromRequest } from '@/lib/auth';
import { generateIntegrationToken } from '@/lib/integration-token';
import { IntegrationAppClient } from '@membranehq/sdk';

/**
 * GET /api/integrations/[integrationId]/events
 * Fetches connector events for a given integration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    const auth = getAuthenticationFromRequest(request);
    if (!auth?.customerId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { integrationId } = await params;

    // Generate integration token for Membrane API calls
    const membraneAccessToken = await generateIntegrationToken(auth);
    const membrane = new IntegrationAppClient({ token: membraneAccessToken });

    // Get the integration to verify it exists and get its key
    // Note: We need to find the integration by ID, but the SDK might not have a direct method
    // We'll fetch events directly from the Membrane API
    const apiUrl = process.env.NEXT_PUBLIC_INTEGRATION_APP_API_URL || 'https://api.integration.app';
    const eventsUrl = `${apiUrl}/integrations/${integrationId}/events`;

    const response = await fetch(eventsUrl, {
      headers: {
        Authorization: `Bearer ${membraneAccessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ events: [] });
      }
      const errorText = await response.text();
      console.error(`Failed to fetch events: ${response.status}`, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch connector events' },
        { status: response.status }
      );
    }

    const events = await response.json();

    // Ensure events is an array
    const eventsArray = Array.isArray(events) ? events : [];

    return NextResponse.json({ events: eventsArray });
  } catch (error) {
    console.error('Error fetching connector events:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
