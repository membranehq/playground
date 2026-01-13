import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/workflow/database';
import { WorkflowRun } from '@/lib/workflow/models/workflow-run';
import { getAuthenticationFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthenticationFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!auth.customerId) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');

    // Build query
    const query: { userId: string; workflowId?: string } = {
      userId: auth.customerId,
    };

    if (workflowId) {
      query.workflowId = workflowId;
    }

    // Get runs with results included
    const runs = await WorkflowRun.find(query)
      .select('workflowId status startedAt completedAt executionTime error results summary')
      .sort({ startedAt: -1 })
      .lean();

    return NextResponse.json(runs);
  } catch (error) {
    console.error('Error fetching workflow runs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
