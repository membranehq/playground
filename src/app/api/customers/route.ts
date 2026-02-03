import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticationFromRequest } from '@/lib/auth';
import { generateIntegrationToken } from '@/lib/integration-token';

const MEMBRANE_API_URI = process.env.MEMBRANE_API_URI || 'https://api.integration.app';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthenticationFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Generate admin token to list all customers
    const adminToken = await generateIntegrationToken(auth, true);

    const response = await fetch(`${MEMBRANE_API_URI}/customers`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to list customers:', errorText);
      return NextResponse.json(
        { error: 'Failed to list customers from Membrane' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error listing customers:', error);
    return NextResponse.json(
      { error: 'Failed to list customers' },
      { status: 500 }
    );
  }
}
