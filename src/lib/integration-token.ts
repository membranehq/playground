import jwt, { Algorithm } from 'jsonwebtoken';

import { CurrentCustomer } from '@/components/providers/customer-provider';

interface TokenData {
  id: string;
  name: string;
}

export interface WorkspaceAuthDetails {
  workspaceKey: string | null;
  workspaceSecret: string | null;
}

export class IntegrationTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntegrationTokenError';
  }
}

export async function generateIntegrationToken(
  details: CurrentCustomer & WorkspaceAuthDetails,
): Promise<string> {
  if (!details.workspaceKey || !details.workspaceSecret) {
    throw new IntegrationTokenError(
      'Integration.app credentials not configured',
    );
  }

  if (!details.customerId || !details.customerName) {
    throw new IntegrationTokenError('Customer details not provided');
  }

  try {
    const tokenData: TokenData = {
      // Required: Identifier of your customer
      id: details.customerId,
      // Required: Human-readable customer name
      name: details.customerName || details.customerId,
    };

    const options = {
      issuer: details.workspaceKey,
      expiresIn: 7200, // 2 hours
      algorithm: 'HS512' as Algorithm,
    };

    return jwt.sign(tokenData, details.workspaceSecret, options);
  } catch (error) {
    console.error('Error generating integration token:', error);
    throw new IntegrationTokenError('Failed to generate integration token');
  }
}
