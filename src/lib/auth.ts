import { NextRequest } from 'next/server';
import { WorkspaceCredentials } from './opencode-service';

export interface Authentication {
  customerId: string;
  customerName: string | null;
  workspaceCredentials: WorkspaceCredentials;
}

/**
 * Extract authentication info from request headers.
 * Returns null if any required auth info is missing.
 */
export function getAuthenticationFromRequest(request: NextRequest): Authentication | null {
  const customerId = request.headers.get('x-auth-id');
  const customerName = request.headers.get('x-customer-name');
  const workspaceKey = request.headers.get('x-workspace-key');
  const workspaceSecret = request.headers.get('x-workspace-secret');

  if (!customerId || !workspaceKey || !workspaceSecret) {
    return null;
  }

  return {
    customerId,
    customerName,
    workspaceCredentials: {
      workspaceKey,
      workspaceSecret,
    },
  };
}
