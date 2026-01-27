import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/workflow/database';
import { WorkflowSession } from '@/lib/workflow/models/workflow-session';
import { getAuthenticationFromRequest } from '@/lib/auth';
import { generateIntegrationToken } from '@/lib/integration-token';

/**
 * GET /api/workflows/[id]/sessions
 * List all Membrane Agent sessions for a workflow
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthenticationFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: workflowId } = await params;
    await connectToDatabase();

    const sessions = await WorkflowSession.findByWorkflow(workflowId, auth.customerId);

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Failed to fetch workflow sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch workflow sessions' }, { status: 500 });
  }
}

/**
 * POST /api/workflows/[id]/sessions
 * Create a new Membrane Agent session for a workflow
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthenticationFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: workflowId } = await params;
    const body = await req.json().catch(() => ({}));
    const initialMessage = body.message as string | undefined;

    // Create Membrane Agent session
    const apiUri = process.env.NEXT_PUBLIC_INTEGRATION_APP_API_URL || 'https://api.integration.app';
    const token = await generateIntegrationToken(auth);

    const url = new URL(`${apiUri}/agent/sessions`);
    const requestBody: Record<string, unknown> = {};
    if (initialMessage) {
      requestBody.prompt = initialMessage;
    }

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
      console.error('Failed to create Membrane session:', response.status, errorText);
      throw new Error(`Failed to create Membrane Agent session: ${response.status}`);
    }

    const data = await response.json();
    const sessionId = data.id || data.sessionId;

    // Create label from initial message (truncated)
    const label = initialMessage ? initialMessage.slice(0, 100) + (initialMessage.length > 100 ? '...' : '') : 'New session';

    // Save session reference to MongoDB
    await connectToDatabase();
    await WorkflowSession.create({
      sessionId,
      workflowId,
      customerId: auth.customerId,
      label,
    });

    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error('Failed to create workflow session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create workflow session' },
      { status: 500 },
    );
  }
}
