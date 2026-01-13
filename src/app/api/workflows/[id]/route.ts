import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/workflow/database';
import { Workflow } from '@/lib/workflow/models/workflow';
import { updateNodesWithOutputSchemas } from '@/lib/workflow/output-schema-calculator';
import { getAuthenticationFromRequest } from '@/lib/auth';
import { generateIntegrationToken } from '@/lib/integration-token';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthenticationFromRequest(req);

    console.log({ auth });
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const workflow = await Workflow.findById(id).lean();

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Failed to fetch workflow:', error);
    return NextResponse.json({ error: 'Failed to fetch workflow' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthenticationFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const updateData = await req.json();
    await connectToDatabase();

    // Get membrane access token for schema calculation
    const membraneAccessToken = await generateIntegrationToken(auth);

    // If nodes are being updated, calculate output schemas
    if (updateData.nodes && Array.isArray(updateData.nodes)) {
      try {
        updateData.nodes = await updateNodesWithOutputSchemas(updateData.nodes, membraneAccessToken);
      } catch (error) {
        console.error('Error calculating output schemas:', error);
        // Continue without output schemas if calculation fails
      }
    }

    const workflow = await Workflow.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Failed to update workflow:', error);
    return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthenticationFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const workflow = await Workflow.findByIdAndDelete(id);

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete workflow:', error);
    return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 });
  }
}
