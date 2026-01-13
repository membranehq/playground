import jwt, { Algorithm } from 'jsonwebtoken';
import { Authentication } from './auth';

interface TokenData {
  id: string;
  name: string;
  isAdmin: number;
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

export async function generateIntegrationToken(details: Authentication): Promise<string> {
  if (!details.workspaceCredentials.workspaceKey || !details.workspaceCredentials.workspaceSecret) {
    throw new IntegrationTokenError('Integration.app credentials not configured');
  }

  if (!details.customerId) {
    throw new IntegrationTokenError('Customer details not provided');
  }

  try {
    const tokenData: TokenData = {
      // Required: Identifier of your customer
      id: details.customerId,
      // Required: Human-readable customer name
      name: details.customerName || details.customerId,
      // Admin mode for full access
      isAdmin: 1,
    };

    const options = {
      issuer: details.workspaceCredentials.workspaceKey,
      expiresIn: 7200, // 2 hours
      algorithm: 'HS512' as Algorithm,
    };

    return jwt.sign(tokenData, details.workspaceCredentials.workspaceSecret, options);
  } catch (error) {
    console.error('Error generating integration token:', error);
    throw new IntegrationTokenError('Failed to generate integration token');
  }
}
