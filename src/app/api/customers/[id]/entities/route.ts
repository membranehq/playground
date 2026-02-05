import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticationFromRequest } from '@/lib/auth';
import { generateIntegrationToken } from '@/lib/integration-token';

const MEMBRANE_API_URI = process.env.MEMBRANE_API_URI || 'https://api.integration.app';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthenticationFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: customerId } = await params;

    // Generate admin token to manage entities
    const adminToken = await generateIntegrationToken(auth, true);

    // Find the customer first to get the MongoDB ObjectId
    const searchResponse = await fetch(`${MEMBRANE_API_URI}/customers?search=${encodeURIComponent(customerId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!searchResponse.ok) {
      console.error('Failed to search for customer');
      return NextResponse.json({ error: 'Failed to find customer' }, { status: searchResponse.status });
    }

    const searchData = await searchResponse.json();
    const customer = searchData.items?.find(
      (c: { id: string; internalId: string }) => c.internalId === customerId || c.id === customerId,
    );

    if (!customer) {
      // Customer doesn't exist, nothing to delete
      return NextResponse.json({ success: true, message: 'Customer not found, no entities to delete' });
    }

    const deletedEntities: string[] = [];
    const errors: string[] = [];

    // Delete connections for this customer
    try {
      const connectionsResponse = await fetch(`${MEMBRANE_API_URI}/connections?userId=${customer.internalId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json();
        const connections = connectionsData.items || [];

        for (const connection of connections) {
          const deleteResponse = await fetch(`${MEMBRANE_API_URI}/connections/${connection.id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${adminToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (deleteResponse.ok) {
            deletedEntities.push(`connection:${connection.id}`);
          } else {
            errors.push(`Failed to delete connection ${connection.id}`);
          }
        }
      }
    } catch (err) {
      errors.push(`Error fetching connections: ${err}`);
    }

    // Delete flow instances for this customer
    try {
      const flowInstancesResponse = await fetch(`${MEMBRANE_API_URI}/flow-instances?userId=${customer.internalId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (flowInstancesResponse.ok) {
        const flowInstancesData = await flowInstancesResponse.json();
        const flowInstances = flowInstancesData.items || [];

        for (const flowInstance of flowInstances) {
          const deleteResponse = await fetch(`${MEMBRANE_API_URI}/flow-instances/${flowInstance.id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${adminToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (deleteResponse.ok) {
            deletedEntities.push(`flow-instance:${flowInstance.id}`);
          } else {
            errors.push(`Failed to delete flow instance ${flowInstance.id}`);
          }
        }
      }
    } catch (err) {
      errors.push(`Error fetching flow instances: ${err}`);
    }

    // Delete tenant-level connectors (non-public connectors created for this tenant)
    try {
      const connectorsResponse = await fetch(`${MEMBRANE_API_URI}/connectors?limit=100`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (connectorsResponse.ok) {
        const connectorsData = await connectorsResponse.json();
        const connectors = connectorsData.items || [];

        // Filter to tenant-level connectors (non-public)
        const tenantConnectors = connectors.filter((connector: { isPublic?: boolean }) => !connector.isPublic);

        for (const connector of tenantConnectors) {
          const deleteResponse = await fetch(`${MEMBRANE_API_URI}/connectors/${connector.id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${adminToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (deleteResponse.ok) {
            deletedEntities.push(`connector:${connector.id}`);
          } else {
            const errorText = await deleteResponse.text();
            errors.push(`Failed to delete connector ${connector.id}: ${errorText}`);
          }
        }
      }
    } catch (err) {
      errors.push(`Error fetching/deleting connectors: ${err}`);
    }

    // Delete tenant-level external apps (non-public apps created for this tenant)
    try {
      const appsResponse = await fetch(`${MEMBRANE_API_URI}/external-apps?limit=100`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (appsResponse.ok) {
        const appsData = await appsResponse.json();
        const apps = appsData.items || [];

        // Filter to tenant-level apps (non-public)
        const tenantApps = apps.filter((app: { isPublic?: boolean }) => !app.isPublic);

        for (const app of tenantApps) {
          const deleteResponse = await fetch(`${MEMBRANE_API_URI}/external-apps/${app.id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${adminToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (deleteResponse.ok) {
            deletedEntities.push(`external-app:${app.id}`);
          } else {
            const errorText = await deleteResponse.text();
            errors.push(`Failed to delete external app ${app.id}: ${errorText}`);
          }
        }
      }
    } catch (err) {
      errors.push(`Error fetching/deleting external apps: ${err}`);
    }

    return NextResponse.json({
      success: true,
      deletedEntities,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error deleting customer entities:', error);
    return NextResponse.json({ error: 'Failed to delete customer entities' }, { status: 500 });
  }
}
