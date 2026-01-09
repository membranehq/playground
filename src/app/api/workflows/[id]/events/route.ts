import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/workflow/lib/mongodb';
import { WorkflowEvent } from '@/lib/workflow/models/workflow-event';
import { getAuthenticationFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthenticationFromRequest(request);
    if (!auth?.customerId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: workflowId } = await params;
    await connectToDatabase();

    const events = await WorkflowEvent.find({ workflowId, userId: auth.customerId })
      .select('workflowId userId eventData receivedAt processed runId')
      .sort({ receivedAt: -1 })
      .limit(100) // Limit to most recent 100 events
      .lean();

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching workflow events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
