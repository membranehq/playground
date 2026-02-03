import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticationFromRequest } from '@/lib/auth';
import { generateIntegrationToken, IntegrationTokenError } from '@/lib/integration-token';
import { Connectible } from '@/types/connectible';

interface SearchResult {
  elementType: string;
  element: Record<string, unknown>;
}

interface SearchResponse {
  items?: SearchResult[];
}

async function searchByType(
  apiUri: string,
  token: string,
  elementType: string,
  query: string,
): Promise<SearchResult[]> {
  try {
    const path = `/search?q=${encodeURIComponent(query)}&elementType=${elementType}`;
    const response = await fetch(`${apiUri}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Error searching ${elementType}:`, response.status, response.statusText);
      return [];
    }

    const data: SearchResponse = await response.json();
    return data.items || [];
  } catch (error) {
    console.error(`Error searching ${elementType}:`, error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthenticationFromRequest(request);

    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query.trim()) {
      return NextResponse.json({ connectibles: [] });
    }

    const apiUri = process.env.NEXT_PUBLIC_INTEGRATION_APP_API_URL || 'https://api.integration.app';
    const token = await generateIntegrationToken(auth);

    // Search for integrations, apps, and connectors in parallel
    const [integrations, apps, connectors] = await Promise.all([
      searchByType(apiUri, token, 'integration', query),
      searchByType(apiUri, token, 'app', query),
      searchByType(apiUri, token, 'connector', query),
    ]);

    const connectibles: Connectible[] = [];
    const seenKeys = new Set<string>();

    // Build lookup maps for apps and connectors
    const appById = new Map<string, Record<string, unknown>>();
    const connectorById = new Map<string, Record<string, unknown>>();

    for (const item of apps) {
      const el = item.element;
      const id = (el.uuid as string) || (el.id as string);
      if (id) appById.set(id, el);
    }

    for (const item of connectors) {
      const el = item.element;
      if (el.id) connectorById.set(el.id as string, el);
    }

    // Process integrations first (highest priority - already set up)
    for (const item of integrations) {
      const el = item.element;
      const key = `integration:${el.id}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const connectible: Connectible = {
        name: (el.name as string) || (el.key as string),
        logoUri: el.logoUri as string | undefined,
        connectParameters: {
          integrationId: el.id as string,
        },
        integration: {
          id: el.id as string,
          key: el.key as string | undefined,
          state: el.state as string | undefined,
          connectorId: el.connectorId as string | undefined,
        },
      };

      // Add external app info if available
      if (el.appUuid) {
        const app = appById.get(el.appUuid as string);
        connectible.externalApp = {
          id: el.appUuid as string,
          key: app?.key as string | undefined,
          name: app?.name as string | undefined,
        };
      }

      // Add connector info if available
      if (el.connectorId) {
        const connector = connectorById.get(el.connectorId as string);
        connectible.connector = {
          id: el.connectorId as string,
          name: connector?.name as string | undefined,
        };
      }

      connectibles.push(connectible);
    }

    // Process apps (can be used to create integrations)
    for (const item of apps) {
      const el = item.element;
      const appId = (el.uuid as string) || (el.id as string);

      // Skip apps without a connector (can't connect)
      const hasConnector = !!el.defaultConnectorId;
      if (!hasConnector) continue;

      // Skip if we already have an integration for this app
      const hasIntegration = connectibles.some((c) => c.externalApp?.id === appId);
      if (hasIntegration) continue;

      const key = `app:${appId}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const connector = connectorById.get(el.defaultConnectorId as string);

      const connectible: Connectible = {
        name: (el.name as string) || (el.key as string),
        logoUri: el.logoUri as string | undefined,
        connectParameters: {
          connectorId: el.defaultConnectorId as string,
        },
        externalApp: {
          id: appId,
          key: el.key as string | undefined,
          name: el.name as string | undefined,
        },
      };

      if (connector) {
        connectible.connector = {
          id: el.defaultConnectorId as string,
          name: connector.name as string | undefined,
        };
      }

      connectibles.push(connectible);
    }

    // Process connectors (fallback if no app or integration)
    for (const item of connectors) {
      const el = item.element;
      const connectorId = el.id as string;

      // Skip if we already have something with this connector
      const hasConnector = connectibles.some(
        (c) => c.connector?.id === connectorId || c.connectParameters.connectorId === connectorId,
      );
      if (hasConnector) continue;

      const key = `connector:${connectorId}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      connectibles.push({
        name: (el.name as string) || (el.key as string),
        logoUri: el.logoUri as string | undefined,
        connectParameters: {
          connectorId: connectorId,
        },
        connector: {
          id: connectorId,
          name: el.name as string | undefined,
        },
      });
    }

    // Sort: existing integrations first, then alphabetically by name
    connectibles.sort((a, b) => {
      // Integrations first
      if (a.integration && !b.integration) return -1;
      if (!a.integration && b.integration) return 1;
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ connectibles });
  } catch (error) {
    console.error('[Connectibles Search] Error:', error);
    if (error instanceof IntegrationTokenError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to search connectibles' }, { status: 500 });
  }
}
