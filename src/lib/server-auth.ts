import { NextRequest } from 'next/server';
import { WorkspaceAuthDetails } from './integration-token';
import { CurrentCustomer } from '@/components/providers/customer-provider';

export function getAuthFromRequest(
  request: NextRequest,
): CurrentCustomer & WorkspaceAuthDetails {
  return {
    customerId: request.headers.get('x-auth-id') ?? '',
    customerName: request.headers.get('x-customer-name') ?? null,
    workspaceKey: request.headers.get('x-workspace-key') ?? null,
    workspaceSecret: request.headers.get('x-workspace-secret') ?? null,
  };
}
