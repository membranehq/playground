import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/workflow/database';
import { WorkflowRun } from '@/lib/workflow/models/workflow-run';
import { Workflow } from '@/lib/workflow/models/workflow';
import { getAuthenticationFromRequest } from '@/lib/auth';
import { generateIntegrationToken } from '@/lib/integration-token';
import { inngest } from '@/inngest/client';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthenticationFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!auth.customerId) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 401 });
    }

    const { id: workflowId } = await params;
    await connectToDatabase();

    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    let triggerInput: Record<string, unknown> = {};
    try {
      const body = await request.json();
      triggerInput = body.input || {};

      console.log('Trigger input:', triggerInput);
    } catch {
      // If no body or invalid JSON, use empty trigger input
      console.log('No trigger input provided, using empty object');
    }

    // Create a workflow run record before starting execution
    const workflowRun = await WorkflowRun.create({
      workflowId: workflowId,
      userId: auth.customerId,
      status: 'running',
      input: triggerInput,
      nodesSnapshot: workflow.nodes, // Capture snapshot of nodes at execution time
      results: [],
      summary: {
        totalNodes: workflow.nodes.length,
        successfulNodes: 0,
        failedNodes: 0,
        successRate: 0,
      },
      startedAt: new Date(),
    });

    // Generate membrane access token
    const membraneAccessToken = await generateIntegrationToken(auth);

    // Send event to Inngest for durable workflow execution
    await inngest.send({
      name: "workflow/execute",
      data: {
        workflowId: workflowId,
        runId: workflowRun._id.toString(),
        membraneToken: membraneAccessToken,
        triggerInput: triggerInput,
      },
    });

    // Update lastRunAt timestamp
    await workflow.updateLastRun();

    // Return the run ID immediately so the frontend can refresh the runs list
    return NextResponse.json({
      message: 'Workflow started successfully',
      workflowId,
      runId: workflowRun._id.toString(),
    });
  } catch (error) {
    console.error('Error running workflow:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
