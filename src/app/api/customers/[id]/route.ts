import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticationFromRequest } from '@/lib/auth';
import { generateIntegrationToken } from '@/lib/integration-token';

const MEMBRANE_API_URI = process.env.MEMBRANE_API_URI || 'https://api.integration.app';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthenticationFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: customerId } = await params;

    // Generate admin token to delete customer
    const adminToken = await generateIntegrationToken(auth, true);

    // First, try to find the customer by internalId
    const searchResponse = await fetch(
      `${MEMBRANE_API_URI}/customers?search=${encodeURIComponent(customerId)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!searchResponse.ok) {
      console.error('Failed to search for customer');
      return NextResponse.json(
        { error: 'Failed to find customer' },
        { status: searchResponse.status }
      );
    }

    const searchData = await searchResponse.json();
    const customer = searchData.items?.find(
      (c: { id: string; internalId: string }) => c.internalId === customerId || c.id === customerId
    );

    if (!customer) {
      // Customer doesn't exist in Membrane yet, just return success
      return NextResponse.json({ success: true, message: 'Customer not found in Membrane' });
    }

    // Delete (archive) the customer
    const deleteResponse = await fetch(`${MEMBRANE_API_URI}/customers/${customer.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error('Failed to delete customer:', errorText);
      return NextResponse.json(
        { error: 'Failed to delete customer from Membrane' },
        { status: deleteResponse.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
