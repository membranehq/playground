import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/workflow/database';
import { WorkflowRun } from '@/lib/workflow/models/workflow-run';
import { executeWorkflowNodes } from '@/lib/workflow/execution/activities';
import type { WorkflowNode } from '@/lib/workflow/execution/types';
import { Workflow } from '@/lib/workflow/models/workflow';
import { WorkflowEvent } from '@/lib/workflow/models/workflow-event';
import {
  verifyVerificationHashForWorkflowEvent,
  WORKFLOW_EVENT_VERIFICATION_HASH_HEADER,
} from '@/lib/workflow/lib/workflow-event-verification';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-workflow-id, Authorization',
};

/**
 * Handle OPTIONS request for CORS preflight
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      endpoint: 'ingest/events',
      timestamp: new Date().toISOString(),
    },
    { headers: corsHeaders },
  );
}

/**
 * POST /api/workflows/[id]/ingest-event
 * Ingests an event and triggers workflow execution
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: workflowId } = await params;

  try {
    // Parse request body
    let event: Record<string, unknown> = {};
    try {
      event = await request.json();

      console.log('Event data:', event);
    } catch (error) {
      console.error('[Ingest Event] Invalid JSON in request body:', error);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400, headers: corsHeaders });
    }

    // Verify authentication hash from headers
    const verificationHash = (event?.headers as Record<string, unknown>)?.[WORKFLOW_EVENT_VERIFICATION_HASH_HEADER] as
      | string
      | undefined;

    if (!verificationHash) {
      return NextResponse.json({ error: 'Verification hash is required' }, { status: 401, headers: corsHeaders });
    }

    const isValidVerificationHash = verifyVerificationHashForWorkflowEvent(workflowId, verificationHash);
    if (!isValidVerificationHash) {
      return NextResponse.json({ error: 'Invalid verification hash' }, { status: 401, headers: corsHeaders });
    }

    // Get membrane access token from headers
    const membraneAccessToken = request.headers.get('x-membrane-token');
    if (!membraneAccessToken) {
      return NextResponse.json({ error: 'Invalid membrane access token' }, { status: 401, headers: corsHeaders });
    }

    // Connect to database and fetch workflow
    await connectToDatabase();
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404, headers: corsHeaders });
    }

    // Verify workflow is active
    if (workflow.status !== 'active') {
      return NextResponse.json({ error: 'Workflow is not active' }, { status: 400, headers: corsHeaders });
    }

    const userId = workflow.userId;
    const eventBody = (event.data as Record<string, unknown>) || event;

    // Save the event to the database
    const savedEvent = await WorkflowEvent.create({
      workflowId,
      userId,
      eventData: eventBody,
      receivedAt: new Date(),
      processed: false,
    });

    // Create workflow run record
    const workflowRun = await WorkflowRun.create({
      workflowId,
      userId,
      status: 'running',
      input: eventBody,
      nodesSnapshot: workflow.nodes,
      results: [],
      summary: {
        totalNodes: workflow.nodes.length,
        successfulNodes: 0,
        failedNodes: 0,
        successRate: 0,
      },
      startedAt: new Date(),
    });

    // Link event to run
    await WorkflowEvent.findByIdAndUpdate(savedEvent._id, {
      processed: true,
      runId: workflowRun._id.toString(),
    });

    // Execute workflow asynchronously
    executeWorkflowNodes(
      workflow.nodes as WorkflowNode[],
      membraneAccessToken,
      eventBody,
      workflowRun._id.toString(),
    ).catch((error) => {
      console.error('[Ingest Event] Error executing workflow:', error);
      // Update run status to failed
      WorkflowRun.findByIdAndUpdate(workflowRun._id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      }).catch((updateError) => {
        console.error('[Ingest Event] Error updating failed run:', updateError);
      });
    });

    // Update last run timestamp
    await workflow.updateLastRun();

    // Return 202 Accepted - request accepted but processing asynchronously
    return NextResponse.json(
      {
        success: true,
        message: 'Event ingested and workflow started',
        workflowId,
        runId: workflowRun._id.toString(),
        timestamp: new Date().toISOString(),
      },
      { status: 202, headers: corsHeaders },
    );
  } catch (error) {
    console.error('[Ingest Event] Error ingesting event:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to ingest event and start workflow',
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
