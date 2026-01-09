import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticationFromRequest } from '@/lib/auth';
import { generateIntegrationToken, IntegrationTokenError } from '@/lib/integration-token';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthenticationFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const token = await generateIntegrationToken(auth);
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    if (error instanceof IntegrationTokenError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
