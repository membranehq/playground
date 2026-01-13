import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/workflow/database';
import { Workflow } from '@/lib/workflow/models/workflow';
import { getAuthenticationFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthenticationFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { name, description } = await req.json();

    await connectToDatabase();

    const workflow = await Workflow.create({
      name,
      description,
      userId: auth.customerId,
      status: 'inactive',
      nodes: [],
    });

    return NextResponse.json({ id: workflow._id, ...workflow.toObject() });
  } catch (error) {
    console.error('Failed to create workflow:', error);
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthenticationFromRequest(req);

    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'active' | 'inactive' | null;

    // Build query - always filter by authenticated user's ID
    const query: { userId: string; status?: 'active' | 'inactive' } = {
      userId: auth.customerId,
    };

    // Optionally filter by status
    if (status) {
      query.status = status;
    }

    const workflows = await Workflow.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json(workflows);
  } catch (error) {
    console.error('Failed to fetch workflows:', error);
    return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 });
  }
}
