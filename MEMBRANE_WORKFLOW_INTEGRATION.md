# Integrating Membrane into Your Workflow Builder

This guide walks you through integrating Membrane into a workflow builder application. By the end, your users will be able to connect 200+ apps, use pre-built actions in workflows, and even create custom integrations for any app on-demand.

**Prerequisites**: Membrane account ([documentation](https://docs.getmembrane.com/docs/Overview)), familiarity with React/TypeScript, understanding of workflow builder concepts (nodes, edges, triggers, actions).

---

## Table of Contents

1. [Quick Start: Minimal Integration](#quick-start-minimal-integration)
2. [Core Integration: App Actions](#core-integration-app-actions)
3. [Self-Integration](#self-integration)
4. [Quick Reference](#quick-reference)
5. [Appendix: Complete Code Patterns](#appendix-complete-code-patterns)
6. [Common Pitfalls](#common-pitfalls)

---

## Quick Start: Minimal Integration

This section gets you from zero to a working "Trigger → App Action" workflow in ~30 minutes.

```
┌─────────────────────────────────────────────────────────────────┐
│                     MINIMAL INTEGRATION                         │
│                                                                 │
│   ┌──────────┐      ┌──────────────┐      ┌──────────────┐     │
│   │ Trigger  │ ───► │ Membrane     │ ───► │ External     │     │
│   │ (Manual) │      │ App Action   │      │ App (Slack,  │     │
│   └──────────┘      └──────────────┘      │ HubSpot...)  │     │
│                            │                                    │
│                            ▼                                    │
│                    ┌──────────────┐                             │
│                    │ Membrane SDK │                             │
│                    │ handles auth │                             │
│                    │ & API calls  │                             │
│                    └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

### Step 1: Install Dependencies

```bash
npm install @membranehq/sdk @membranehq/react jsonwebtoken
```

<details>
<summary><strong>Agent Spec: Dependencies</strong></summary>

```json
{
  "dependencies": {
    "@membranehq/sdk": "latest",
    "@membranehq/react": "latest",
    "jsonwebtoken": "^9.0.0"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.0"
  }
}
```

</details>

### Step 2: Environment Variables

```env
MEMBRANE_API_URI=https://api.getmembrane.com
MEMBRANE_UI_URI=https://app.getmembrane.com
MEMBRANE_WORKSPACE_KEY=your_workspace_key
MEMBRANE_WORKSPACE_SECRET=your_workspace_secret
```

<details>
<summary><strong>Agent Spec: Environment Variables</strong></summary>

```json
{
  "required_env_vars": [
    {
      "name": "MEMBRANE_API_URI",
      "description": "Membrane API base URL",
      "default": "https://api.getmembrane.com"
    },
    {
      "name": "MEMBRANE_UI_URI", 
      "description": "Membrane UI base URL for embedded components",
      "default": "https://app.getmembrane.com"
    },
    {
      "name": "MEMBRANE_WORKSPACE_KEY",
      "description": "Your Membrane workspace key from dashboard"
    },
    {
      "name": "MEMBRANE_WORKSPACE_SECRET",
      "description": "Your Membrane workspace secret (keep secure, server-side only)"
    }
  ]
}
```

</details>

### Step 3: Token Generation

You'll need to generate JWT tokens for Membrane API authentication. See the [Membrane Authentication Documentation](https://docs.getmembrane.com/docs/authentication) for detailed instructions on token generation and best practices.

### Step 4: Add MembraneProvider

Wrap your application (or workflow builder section) with Membrane's provider.

```tsx
import { MembraneProvider } from '@membranehq/react'

async function fetchToken() {
  const response = await fetch('/api/membrane-token')
  const { token } = await response.json()
  return token
}

export function MyApp() {
  return (
    <MembraneProvider fetchToken={fetchToken}>
      <YourApp />
    </MembraneProvider>
  )
}
```

For more details, see the [React SDK Documentation](https://docs.getmembrane.com/docs/react-sdk).

### Step 5: Your First Trigger → Action Workflow

With the provider in place, you can now build a minimal workflow with two nodes:

```
┌─────────────┐         ┌─────────────────┐
│   Manual    │────────►│   Slack:        │
│   Trigger   │         │   Send Message  │
└─────────────┘         └─────────────────┘
      │                        │
      │ User clicks            │ Membrane SDK
      │ "Run Workflow"         │ executes action
      ▼                        ▼
  { input: ... }          Message sent!
```

The following sections explain how to build the configuration UI and execution logic.

### Step 6: Complete Action Configuration UI

Here's a complete, working component for configuring Membrane actions in your workflow builder. This handles the full flow: app selection → OAuth connection → action selection → input configuration.

```tsx
// components/membrane/action-config.tsx

"use client";

import {
  useActions,
  useConnections,
  useIntegrationApp,
  useIntegrations,
} from "@membranehq/react";
import { useEffect } from "react";

type MembraneActionConfigProps = {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: unknown) => void;
  disabled?: boolean;
};

export function MembraneActionConfig({
  config,
  onUpdateConfig,
  disabled = false,
}: MembraneActionConfigProps) {
  const integrationApp = useIntegrationApp();
  const { items: integrations, loading: integrationsLoading } = useIntegrations();
  const { 
    items: connections, 
    loading: connectionsLoading, 
    refresh: refreshConnections 
  } = useConnections();

  // Read current config values
  const selectedIntegrationKey = (config?.membraneIntegrationKey as string) || "";
  const selectedActionId = (config?.membraneActionId as string) || "";
  const selectedConnectionId = (config?.membraneConnectionId as string) || "";

  // Fetch actions for selected integration
  const { items: actions, loading: actionsLoading } = useActions({
    integrationKey: selectedIntegrationKey || undefined,
  });

  // Filter connections for selected integration
  const filteredConnections = connections?.filter(
    (conn) => conn.integration?.key === selectedIntegrationKey
  );

  // Handlers
  const handleIntegrationChange = (integrationKey: string) => {
    onUpdateConfig("membraneIntegrationKey", integrationKey);
    // Clear dependent fields when integration changes
    onUpdateConfig("membraneConnectionId", "");
    onUpdateConfig("membraneActionId", "");
  };

  const handleActionChange = (actionId: string) => {
    onUpdateConfig("membraneActionId", actionId);
  };

  const handleConnectionChange = (connectionId: string) => {
    onUpdateConfig("membraneConnectionId", connectionId);
  };

  // Open OAuth flow for new connection
  const handleConnectApp = async () => {
    if (!selectedIntegrationKey || !integrationApp) return;

    try {
      const connection = await integrationApp
        .integration(selectedIntegrationKey)
        .openNewConnection();

      if (connection) {
        refreshConnections();
        onUpdateConfig("membraneConnectionId", connection.id);
      }
    } catch (error) {
      console.error("Failed to connect app:", error);
    }
  };

  // Reconnect/update existing connection
  const handleReconnect = async (connectionId: string) => {
    if (!integrationApp) return;

    try {
      await integrationApp.connection(connectionId).open();
      refreshConnections();
    } catch (error) {
      console.error("Failed to reconnect:", error);
    }
  };

  // Auto-select connection if only one exists for this integration
  useEffect(() => {
    if (
      filteredConnections?.length === 1 &&
      !selectedConnectionId &&
      selectedIntegrationKey
    ) {
      onUpdateConfig("membraneConnectionId", filteredConnections[0].id);
    }
  }, [filteredConnections, selectedConnectionId, selectedIntegrationKey, onUpdateConfig]);

  return (
    <div className="space-y-4">
      {/* Step 1: App Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">App</label>
        <select
          disabled={disabled || integrationsLoading}
          onChange={(e) => handleIntegrationChange(e.target.value)}
          value={selectedIntegrationKey}
          className="w-full rounded border p-2"
        >
          <option value="">
            {integrationsLoading ? "Loading apps..." : "Select an app"}
          </option>
          {integrations?.filter((i) => i.key).map((integration) => (
            <option key={integration.key} value={integration.key!}>
              {integration.name}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: Connection Selection (only shown after app selected) */}
      {selectedIntegrationKey && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Connection</label>
            <button
              type="button"
              onClick={handleConnectApp}
              disabled={disabled}
              className="text-xs text-blue-600 hover:underline"
            >
              + New Connection
            </button>
          </div>
          
          {connectionsLoading ? (
            <div className="text-sm text-gray-500">Loading connections...</div>
          ) : filteredConnections && filteredConnections.length > 0 ? (
            <div className="space-y-2">
              <select
                disabled={disabled}
                onChange={(e) => handleConnectionChange(e.target.value)}
                value={selectedConnectionId}
                className="w-full rounded border p-2"
              >
                <option value="">Select a connection</option>
                {filteredConnections.map((connection) => (
                  <option key={connection.id} value={connection.id}>
                    {connection.name || `Connection ${connection.id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
              {selectedConnectionId && (
                <button
                  type="button"
                  onClick={() => handleReconnect(selectedConnectionId)}
                  disabled={disabled}
                  className="w-full rounded border p-2 text-sm hover:bg-gray-50"
                >
                  Reconnect / Update Credentials
                </button>
              )}
            </div>
          ) : (
            <div className="rounded border border-dashed p-3 text-center">
              <p className="text-sm text-gray-500">No connections yet</p>
              <button
                type="button"
                onClick={handleConnectApp}
                disabled={disabled}
                className="mt-2 rounded bg-blue-600 px-3 py-1 text-sm text-white"
              >
                Connect {integrations?.find((i) => i.key === selectedIntegrationKey)?.name}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Action Selection (only shown after connection selected) */}
      {selectedIntegrationKey && selectedConnectionId && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Action</label>
          <select
            disabled={disabled || actionsLoading}
            onChange={(e) => handleActionChange(e.target.value)}
            value={selectedActionId}
            className="w-full rounded border p-2"
          >
            <option value="">
              {actionsLoading ? "Loading actions..." : "Select an action"}
            </option>
            {actions?.filter((a) => a.id).map((action) => (
              <option key={action.id} value={action.id}>
                {action.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Step 4: Action Input (only shown after action selected) */}
      {selectedActionId && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Action Input (JSON)</label>
          <textarea
            disabled={disabled}
            value={(config?.membraneActionInput as string) || "{}"}
            onChange={(e) => onUpdateConfig("membraneActionInput", e.target.value)}
            placeholder='{"channel": "#general", "text": "Hello!"}'
            rows={6}
            className="w-full rounded border p-2 font-mono text-sm"
          />
          <p className="text-xs text-gray-500">
            Use {"{{NodeName.field}}"} syntax for dynamic values from previous steps.
          </p>
        </div>
      )}
    </div>
  );
}
```

<details>
<summary><strong>Agent Spec: Action Configuration Component</strong></summary>

```json
{
  "component": "MembraneActionConfig",
  "purpose": "Complete UI for configuring Membrane actions in workflow nodes",
  "config_fields": {
    "membraneIntegrationKey": "string - selected app key (e.g., 'slack')",
    "membraneActionId": "string - selected action ID",
    "membraneConnectionId": "string - user's OAuth connection ID",
    "membraneActionInput": "string - JSON input for the action"
  },
  "ui_flow": [
    "1. Select App (from useIntegrations)",
    "2. Connect or select existing connection (useConnections + openNewConnection)",
    "3. Select Action (from useActions, filtered by integrationKey)",
    "4. Configure action input (JSON textarea)"
  ],
  "key_behaviors": {
    "auto_select_connection": "If only one connection exists, auto-select it",
    "clear_dependent_fields": "When app changes, clear connection and action",
    "oauth_flow": "integrationApp.integration(key).openNewConnection() opens Membrane's OAuth UI"
  },
  "important_notes": [
    "Filter connections by integration key: conn.integration?.key === selectedIntegrationKey",
    "The OAuth modal is provided by Membrane - do not rebuild it"
  ]
}
```

</details>

### Step 7: Server-Side Action Execution

When workflows run, execute Membrane actions on the server. Here's a complete step handler:
When workflows run, execute Membrane actions on the server using the `@membranehq/sdk`. The JWT token must include the **actual user ID** who owns the connection.

Here's a complete step handler:

```typescript
// plugins/membrane/steps/app-action.ts

import "server-only";

import { IntegrationAppClient } from "@membranehq/sdk";
import jwt from "jsonwebtoken";
import { SignJWT } from "jose";  // Use jose instead of jsonwebtoken for edge compatibility

const MEMBRANE_API_URI = process.env.MEMBRANE_API_URI || "https://api.integration.app";

export type MembraneAppActionInput = {
  membraneIntegrationKey: string;
  membraneActionId: string;
  membraneConnectionId: string;
  membraneActionInput?: string;      // JSON string
  _context?: {
    userId?: string;  // REQUIRED: The actual user ID who owns the connection
  };
};

type MembraneAppActionResult =
  | { success: true; result: unknown }
  | { success: false; error: string };

/**
 * Generate a Membrane JWT token for server-side execution
 * Generate a Membrane JWT token for server-side execution using jose
 */
function generateMembraneToken(userId: string): string {
async function generateMembraneToken(userId: string): Promise<string> {
  const workspaceKey = process.env.MEMBRANE_WORKSPACE_KEY;
  const workspaceSecret = process.env.MEMBRANE_WORKSPACE_SECRET;

  if (!workspaceKey || !workspaceSecret) {
    throw new Error("Membrane workspace credentials not configured");
  }

  return jwt.sign(
    {
      iss: workspaceKey,
      id: userId,
      name: "Workflow Execution",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    workspaceSecret,
    { algorithm: "HS512" }
  );
  const secret = new TextEncoder().encode(workspaceSecret);

  const token = await new SignJWT({
    iss: workspaceKey,
    id: userId,
    name: "Workflow Execution",
  })
    .setProtectedHeader({ alg: "HS512" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);

  return token;
}

/**
 * Execute a Membrane action
 * Execute a Membrane action via SDK
 */
export async function membraneAppActionStep(
  input: MembraneAppActionInput
): Promise<MembraneAppActionResult> {
  const {
    membraneIntegrationKey,
    membraneActionId,
    membraneConnectionId,
    membraneActionInput,
    _context,
  } = input;

  // Validate required fields
  if (!membraneIntegrationKey) {
    return { success: false, error: "Membrane integration key is required" };
  }

  if (!membraneActionId) {
    return { success: false, error: "Membrane action ID is required" };
  }

  if (!membraneConnectionId) {
    return { success: false, error: "Membrane connection ID is required" };
  }

  const userId = _context?.userId;
  if (!userId) {
    return { success: false, error: "User ID is required for Membrane authentication" };
  }

  try {
    // Generate token for this execution
    const token = generateMembraneToken("workflow-execution");
    const token = await generateMembraneToken(userId);

    // Parse action input if provided
    let actionInput: Record<string, unknown> = {};
    if (membraneActionInput) {
      try {
        actionInput = JSON.parse(membraneActionInput);
      } catch {
        return { success: false, error: "Invalid JSON in action input" };
      }
    }

    // Create Membrane client and execute action
    const client = new IntegrationAppClient({ token });
    const client = new IntegrationAppClient({
      token,
      apiUri: MEMBRANE_API_URI,
    });

    const result = await client
      .connection(membraneConnectionId)
      .action(membraneActionId)
      .run(actionInput);
      .run(actionInput, { connectionId: membraneConnectionId });

    return { success: true, result };
  } catch (error) {
    return {
      success: false,
      error: `Membrane action failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
```

**Passing User ID Through Workflow Execution:**

Your workflow executor passes the user ID to each step via the execution context:

```typescript
// Workflow executor input type
type WorkflowExecutionInput = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  executionId?: string;
  workflowId?: string;
  userId?: string;
};

// Execute route
const { user } = await auth();
executeWorkflow({
  nodes: workflow.nodes,
  edges: workflow.edges,
  executionId: execution.id,
  workflowId,
  userId: user.id,
});

// Step context
const stepContext = {
  executionId,
  nodeId: node.id,
  userId,
};
```

<details>
<summary><strong>Agent Spec: Server-Side Execution</strong></summary>

```json
{
  "function": "membraneAppActionStep",
  "purpose": "Execute Membrane actions during workflow runs",
  "input_fields": {
    "membraneIntegrationKey": "string - the app (e.g., 'slack')",
    "membraneActionId": "string - the action ID (from useActions)",
    "membraneConnectionId": "string - the user's connection",
    "membraneActionInput": "string (optional) - JSON input for the action"
    "membraneActionInput": "string (optional) - JSON input for the action",
    "_context.userId": "string - the user ID who owns the connection"
  },
  "execution_flow": [
    "1. Validate required fields",
    "2. Generate server-side JWT token",
    "1. Validate required fields including userId",
    "2. Generate JWT token with user ID",
    "3. Parse action input JSON",
    "4. Create IntegrationAppClient with token",
    "5. Execute: client.connection(id).action(actionId).run(input)",
    "4. Create IntegrationAppClient with token and apiUri",
    "5. Execute: client.action(actionId).run(input, { connectionId })",
    "6. Return result or error"
  ],
  "notes": [
    "Server-side tokens can use a generic userId like 'workflow-execution'"
  "requirements": [
    "Use @membranehq/sdk IntegrationAppClient for action execution",
    "Include actual user ID in JWT token",
    "Use jose library for JWT generation (edge-compatible)",
    "Set apiUri to https://api.integration.app"
  ]
}
```

</details>

---

## Core Integration: App Actions

This section covers the primary integration point: letting users add app actions to their workflows.

### Workflow Node Data Model

Define a node structure that supports Membrane actions:

```typescript
// types/workflow.ts

interface WorkflowNode {
  id: string;
  name: string;
  type: "trigger" | "action";
  nodeType: "manual" | "event" | "http" | "action" | "ai" | "gate";
  config: NodeConfig;
  outputSchema?: JSONSchema;    // What this node outputs
  ready: boolean;               // All required config provided?
}

interface ActionNodeConfig {
  integrationKey?: string;      // e.g., "slack", "hubspot"
  actionId?: string;            // e.g., "send-message"
  connectionId?: string;        // User's connected account
  inputMapping?: Record<string, unknown>;  // Maps previous outputs to action inputs
}
```

<details>
<summary><strong>Agent Spec: Node Data Model</strong></summary>

```json
{
  "WorkflowNode": {
    "id": "string - unique node identifier",
    "name": "string - display name",
    "type": "enum: 'trigger' | 'action'",
    "nodeType": "enum: 'manual' | 'event' | 'http' | 'action' | 'ai' | 'gate'",
    "config": "object - node-type-specific configuration",
    "outputSchema": "JSONSchema - describes node output structure",
    "ready": "boolean - true when all required config is set"
  },
  "ActionNodeConfig": {
    "integrationKey": "string - Membrane integration identifier",
    "actionId": "string - specific action within integration",
    "connectionId": "string - user's connection instance ID",
    "inputMapping": "object - maps variable references to action inputs"
  },
  "validation": {
    "action_node_ready": "integrationKey AND actionId are required"
  }
}
```

</details>

### Discovering and Adding New Apps

Before users can connect apps, they need to discover available apps from Membrane's app catalog. There are two types of apps:

1. **Integrations** (`useIntegrations()`) - Apps already added to your workspace
2. **External Apps** (`external-apps` API) - Membrane's full app catalog for discovery

```
┌─────────────────────────────────────────────────────────────────────┐
│                    APP DISCOVERY FLOW                               │
│                                                                     │
│   ┌─────────────────┐      ┌─────────────────┐      ┌────────────┐ │
│   │  Your Workspace │      │  Membrane App   │      │  External  │ │
│   │  Integrations   │      │  Catalog        │      │  App       │ │
│   │  (useIntegra-   │      │  (external-apps │      │  Selected  │ │
│   │   tions)        │      │   API)          │      │            │ │
│   └────────┬────────┘      └────────┬────────┘      └─────┬──────┘ │
│            │                        │                      │        │
│            │ Already added          │ Search & discover    │        │
│            │ to workspace           │ new apps             │        │
│            ▼                        ▼                      ▼        │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │              integrationApp.integrations.create()            │  │
│   │              Creates integration in your workspace           │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                    │                                │
│                                    ▼                                │
│                         App available for connection                │
└─────────────────────────────────────────────────────────────────────┘
```

#### Fetching External Apps (App Catalog)

Use the `external-apps` endpoint to search Membrane's full app catalog:

```typescript
// hooks/use-external-apps.ts

import { useState, useEffect, useCallback } from "react";
import { useIntegrationApp } from "@membranehq/react";
import type { App } from "@membranehq/sdk";

interface UseExternalAppsOptions {
  search?: string;
  limit?: number;
  enabled?: boolean;
}

export function useExternalApps(options: UseExternalAppsOptions = {}) {
  const { search = "", limit = 50, enabled = true } = options;
  const integrationApp = useIntegrationApp();
  const [apps, setApps] = useState<App[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchApps = useCallback(async () => {
    if (!enabled || !integrationApp) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch from Membrane's app catalog
      const response = await integrationApp.get("external-apps", {
        search: search || undefined,
        limit,
      });
      setApps(response.items || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch apps"));
      setApps([]);
    } finally {
      setIsLoading(false);
    }
  }, [integrationApp, search, limit, enabled]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  return { apps, isLoading, error, refetch: fetchApps };
}
```

#### Creating an Integration from an External App

When a user selects an app from the catalog, create an integration in your workspace:

```typescript
// When user selects an app from the catalog
const handleExternalAppSelect = async (app: App) => {
  const integrationApp = useIntegrationApp();
  
  // Create integration in your workspace from the external app
  const newIntegration = await integrationApp.integrations.create({
    name: app.name,
    logoUri: app.logoUri,
    appUuid: app.uuid,
    connectorId: app.defaultConnectorId,
    key: app.key,
  });

  // Refresh your integrations list
  await refreshIntegrations();

  // Now this app is available for connection
  return newIntegration;
};
```

<details>
<summary><strong>Agent Spec: External Apps API</strong></summary>

```json
{
  "endpoint": "external-apps",
  "method": "integrationApp.get('external-apps', options)",
  "options": {
    "search": "string - search query to filter apps by name",
    "limit": "number - max results to return (default: 50)"
  },
  "response": {
    "items": "App[] - array of available apps"
  },
  "App": {
    "uuid": "string - unique app identifier",
    "key": "string - app key for integration creation",
    "name": "string - display name",
    "logoUri": "string - app logo URL",
    "defaultConnectorId": "string - connector to use for this app"
  },
  "create_integration": {
    "method": "integrationApp.integrations.create(params)",
    "params": {
      "name": "string - from app.name",
      "logoUri": "string - from app.logoUri",
      "appUuid": "string - from app.uuid",
      "connectorId": "string - from app.defaultConnectorId",
      "key": "string - from app.key"
    },
    "returns": "Integration - the newly created integration"
  },
  "flow": [
    "1. User searches for app using external-apps API",
    "2. User selects app from results",
    "3. Call integrationApp.integrations.create() with app data",
    "4. Refresh integrations list",
    "5. New integration available for connection"
  ]
}
```

</details>

#### App Search UI Example

```tsx
// components/app-search.tsx

import { useState } from "react";
import { useExternalApps } from "@/hooks/use-external-apps";
import { useDebounce } from "@/hooks/use-debounce";

export function AppSearch({ onSelect }: { onSelect: (app: App) => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { apps, isLoading, error } = useExternalApps({
    search: debouncedSearch,
    limit: 50,
    enabled: true,
  });

  return (
    <div className="app-search">
      <input
        type="text"
        placeholder="Search apps..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {isLoading && <LoadingSpinner />}
      
      {error && <ErrorMessage message="Failed to load apps" />}

      <div className="app-grid">
        {apps.map((app) => (
          <button
            key={app.key}
            onClick={() => onSelect(app)}
            className="app-card"
          >
            <img src={app.logoUri} alt={app.name} />
            <span>{app.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Connection Selection UI

When a user adds an "App Action" node, they first select which app to use:

```tsx
// components/workflow/app-selector.tsx

import { useIntegrations, useIntegrationApp } from "@membranehq/react";

export function AppSelector({ 
  onSelect 
}: { 
  onSelect: (integrationKey: string) => void 
}) {
  const { items: integrations, loading } = useIntegrations();
  const integrationApp = useIntegrationApp();

  const handleAppClick = async (integration: Integration) => {
    // Open Membrane's connection UI
    const connection = await integrationApp
      .integration(integration.key)
      .openNewConnection();
    
    if (connection) {
      onSelect(integration.key);
    }
  };

  return (
    <div className="app-grid">
      {integrations?.map((integration) => (
        <button
          key={integration.key}
          onClick={() => handleAppClick(integration)}
          className="app-card"
        >
          <img src={integration.logoUri} alt={integration.name} />
          <span>{integration.name}</span>
        </button>
      ))}
    </div>
  );
}
```

```
┌─────────────────────────────────────────────────────────────┐
│                    Select an App                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  Slack  │  │ HubSpot │  │ Notion  │  │ Airtable│  ...   │
│  │   [S]   │  │   [H]   │  │   [N]   │  │   [A]   │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                             │
│  Clicking opens Membrane's OAuth connection flow            │
│  ─────────────────────────────────────────────────          │
│  │ This is Membrane UI - don't rebuild it! │                │
│  ─────────────────────────────────────────────              │
└─────────────────────────────────────────────────────────────┘
```

<details>
<summary><strong>Agent Spec: Connection Flow</strong></summary>

```json
{
  "hook": "useIntegrations",
  "returns": {
    "items": "Integration[] - available integrations",
    "loading": "boolean",
    "error": "Error | null",
    "refresh": "() => void"
  },
  "Integration": {
    "key": "string - unique identifier (e.g., 'slack')",
    "name": "string - display name",
    "logoUri": "string - integration logo URL"
  },
  "connection_flow": {
    "method": "integrationApp.integration(key).openNewConnection()",
    "behavior": "Opens Membrane modal for OAuth/API key auth",
    "returns": "Connection object on success, null on cancel",
    "note": "This UI is provided by Membrane - do not rebuild"
  }
}
```

</details>

### Action Selection

After connecting, show available actions for the selected integration:

```tsx
// components/workflow/action-selector.tsx

import { useActions } from "@membranehq/react";

export function ActionSelector({
  integrationKey,
  onSelect,
}: {
  integrationKey: string;
  onSelect: (actionId: string) => void;
}) {
  const { items: actions, loading } = useActions({ integrationKey });

  return (
    <div className="action-list">
      {actions?.map((action) => (
        <button
          key={action.id}
          onClick={() => onSelect(action.id)}
          className="action-item"
        >
          <span className="action-name">{action.name}</span>
          <span className="action-description">{action.description}</span>
        </button>
      ))}
    </div>
  );
}
```

<details>
<summary><strong>Agent Spec: Actions API</strong></summary>

```json
{
  "hook": "useActions",
  "params": {
    "integrationKey": "string - required"
  },
  "returns": {
    "items": "Action[]",
    "loading": "boolean",
    "error": "Error | null"
  },
  "Action": {
    "id": "string - action identifier",
    "key": "string - action key",
    "name": "string - display name",
    "description": "string - what the action does",
    "inputSchema": "JSONSchema - required inputs",
    "outputSchema": "JSONSchema - action output structure"
  }
}
```

</details>

### Input Mapping: Connecting Data Between Nodes

Workflow power comes from passing data between nodes. Users map outputs from previous steps to action inputs.

```
┌─────────────┐         ┌─────────────────────────────────────┐
│   Trigger   │────────►│   Slack: Send Message               │
│             │         │                                     │
│ Output:     │         │  Input Mapping:                     │
│ {           │         │  ┌─────────────────────────────┐    │
│   message:  │────────►│  │ channel: #general           │    │
│   "Hello"   │         │  │ text: {{Trigger.message}}   │◄───┼── Variable ref
│ }           │         │  └─────────────────────────────┘    │
└─────────────┘         └─────────────────────────────────────┘
```

```typescript
// components/workflow/input-mapping.tsx

import { useAction } from "@membranehq/react";

export function InputMappingEditor({
  actionId,
  integrationKey,
  previousNodes,
  value,
  onChange,
}: {
  actionId: string;
  integrationKey: string;
  previousNodes: WorkflowNode[];
  value: Record<string, unknown>;
  onChange: (mapping: Record<string, unknown>) => void;
}) {
  const { data: action } = useAction({ id: actionId, integrationKey });
  
  // Build variable schema from previous nodes
  const variableSchema = buildVariableSchema(previousNodes);

  if (!action?.inputSchema) return null;

  return (
    <div className="input-mapping">
      {Object.entries(action.inputSchema.properties || {}).map(([key, schema]) => (
        <div key={key} className="input-field">
          <label>{schema.title || key}</label>
          <DataInput
            schema={schema}
            variableSchema={variableSchema}
            value={value[key]}
            onChange={(v) => onChange({ ...value, [key]: v })}
          />
        </div>
      ))}
    </div>
  );
}

// Variable references use this format:
// { "$var": "$.Previous Steps.Trigger.message" }

function buildVariableSchema(previousNodes: WorkflowNode[]) {
  return {
    type: "object",
    properties: {
      "Previous Steps": {
        type: "object",
        properties: Object.fromEntries(
          previousNodes.map((node) => [
            node.name,
            node.outputSchema || { type: "object" },
          ])
        ),
      },
    },
  };
}
```

<details>
<summary><strong>Agent Spec: Variable Reference Format</strong></summary>

```json
{
  "variable_reference": {
    "format": { "$var": "$.Previous Steps.<NodeName>.<path>" },
    "example": { "$var": "$.Previous Steps.HTTP Request.body.userId" },
    "path_syntax": "JSONPath-like dot notation"
  },
  "variable_schema": {
    "structure": {
      "Previous Steps": {
        "<Node 1 Name>": "<Node 1 outputSchema>",
        "<Node 2 Name>": "<Node 2 outputSchema>"
      }
    },
    "purpose": "Enables autocomplete and validation in UI"
  },
  "resolution": {
    "timing": "At workflow execution time",
    "method": "Walk path through accumulated node outputs",
    "fallback": "null if path doesn't exist"
  }
}
```

</details>

### Executing Actions in Workflow Runs

When a workflow runs, execute the Membrane action with resolved inputs:

```typescript
// lib/workflow/execute-action.ts

import { IntegrationAppClient } from "@membranehq/sdk";

export async function executeMembraneAction(
  node: WorkflowNode,
  previousResults: Record<string, unknown>,
  membraneToken: string
): Promise<NodeExecutionResult> {
  const { integrationKey, actionId, connectionId, inputMapping } = node.config;

  // Resolve variable references from previous step outputs
  const resolvedInput = resolveVariables(inputMapping, previousResults);

  // Create Membrane client
  const client = new IntegrationAppClient({ token: membraneToken });

  // Execute the action
  const result = await client
    .connection(connectionId)
    .action(actionId)
    .run(resolvedInput);

  return {
    nodeId: node.id,
    success: true,
    output: result,
  };
}

function resolveVariables(
  mapping: Record<string, unknown>,
  context: Record<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(mapping)) {
    if (isVariableRef(value)) {
      resolved[key] = resolvePath(value.$var, context);
    } else if (typeof value === "object" && value !== null) {
      resolved[key] = resolveVariables(value, context);
    } else {
      resolved[key] = value;
    }
  }
  
  return resolved;
}

function isVariableRef(value: unknown): value is { $var: string } {
  return typeof value === "object" && value !== null && "$var" in value;
}

function resolvePath(path: string, context: Record<string, unknown>): unknown {
  // path format: "$.Previous Steps.NodeName.field.nested"
  const parts = path.replace(/^\$\./, "").split(".");
  let current: unknown = context;
  
  for (const part of parts) {
    if (current === null || current === undefined) return null;
    current = (current as Record<string, unknown>)[part];
  }
  
  return current;
}
```

<details>
<summary><strong>Agent Spec: Action Execution</strong></summary>

```json
{
  "sdk": "@membranehq/sdk",
  "client": "IntegrationAppClient",
  "initialization": {
    "token": "JWT from token endpoint (per-request or cached)"
  },
  "execution_chain": [
    "client.connection(connectionId)",
    ".action(actionId)", 
    ".run(resolvedInputs)"
  ],
  "variable_resolution": {
    "input": "inputMapping with $var references",
    "output": "fully resolved object with actual values",
    "recursive": "handles nested objects"
  },
  "error_handling": {
    "catch": "SDK throws on API errors",
    "response": "Include error in NodeExecutionResult"
  }
}
```

</details>

---

## Self-Integration

The Self-Integration feature lets users connect **any app** - even ones without pre-built Membrane integrations - by using AI to build custom connectors on-demand.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SELF-INTEGRATION FLOW                          │
│                                                                     │
│   User wants to connect "Acme CRM" (no pre-built integration)       │
│                                                                     │
│   ┌─────────────────┐      ┌─────────────────┐      ┌────────────┐ │
│   │  "Connect Any   │      │   AI Agent      │      │  Custom    │ │
│   │   App" Button   │─────►│   Session       │─────►│  Connector │ │
│   │                 │      │                 │      │  Created!  │ │
│   └─────────────────┘      └─────────────────┘      └────────────┘ │
│          │                        │                       │         │
│          │                        │                       │         │
│          ▼                        ▼                       ▼         │
│   User enters:              AI analyzes app         Available in   │
│   - App name                API docs and            workflow       │
│   - App URL                 builds connector        builder        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Why Self-Integration Matters

1. **No integration gaps**: Users aren't limited to pre-built connectors
2. **Zero wait time**: No need to request and wait for new integrations
3. **Custom apps**: Works with internal tools and niche SaaS products
4. **AI-powered**: Automatically reads API docs and builds the connector

### Implementation: "Connect Any App" UI

```tsx
// components/integrations/connect-any-app.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConnectAnyApp() {
  const [isOpen, setIsOpen] = useState(false);
  const [appName, setAppName] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleBuildIntegration = async () => {
    setIsLoading(true);
    
    // Create AI agent session
    const response = await fetch("/api/agent/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    
    const { sessionId } = await response.json();
    
    // Redirect to agent with pre-filled prompt
    const prompt = `Build a connector and integration for this app: ${appName} (${appUrl}). 
    
    Please:
    1. Analyze the app's API documentation
    2. Create a connector with authentication
    3. Add common actions (CRUD operations)
    4. Test the integration`;
    
    router.push(
      `/agent/sessions/${sessionId}?message=${encodeURIComponent(prompt)}`
    );
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="connect-any-app-button"
      >
        + Connect Any App
      </button>

      {isOpen && (
        <Dialog onClose={() => setIsOpen(false)}>
          <h2>Connect Any App</h2>
          <p>
            Don't see your app in the list? Our AI can build a custom 
            integration for any app with an API.
          </p>
          
          <input
            placeholder="App name (e.g., Acme CRM)"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
          />
          
          <input
            placeholder="App URL (e.g., https://acmecrm.com)"
            value={appUrl}
            onChange={(e) => setAppUrl(e.target.value)}
          />
          
          <button 
            onClick={handleBuildIntegration}
            disabled={!appName || !appUrl || isLoading}
          >
            {isLoading ? "Starting AI Agent..." : "Build Integration"}
          </button>
        </Dialog>
      )}
    </>
  );
}
```

<details>
<summary><strong>Agent Spec: Self-Integration UI</strong></summary>

```json
{
  "component": "ConnectAnyApp",
  "trigger": "Button in integrations list or empty state",
  "inputs": {
    "appName": "string - display name for the app",
    "appUrl": "string - app website or API docs URL"
  },
  "flow": [
    "1. User clicks 'Connect Any App'",
    "2. Dialog collects app name and URL",
    "3. Create AI agent session via POST /api/agent/sessions",
    "4. Redirect to /agent/sessions/{id}?message={prompt}",
    "5. AI agent builds connector interactively",
    "6. On completion, new integration appears in list"
  ],
  "prompt_template": "Build a connector and integration for this app: {appName} ({appUrl})..."
}
```

</details>

### AI Agent Session Backend

```typescript
// /api/agent/sessions/route.ts

export async function POST(request: Request) {
  const customerId = getCustomerIdFromRequest(request);
  
  // Create session with your AI agent service (e.g., OpenCode)
  const session = await createAgentSession({
    customerId,
    type: "membrane-integration-builder",
  });

  return Response.json({ 
    sessionId: session.id 
  });
}
```

```typescript
// /api/agent/sessions/[id]/messages/route.ts

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const messages = await getAgentSessionMessages(params.id);
  return Response.json({ messages });
}
```

---

## Quick Reference

### API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/membrane-token` | GET | Get Membrane JWT token |
| `/api/workflows` | GET, POST | List/create workflows |
| `/api/workflows/[id]` | GET, PATCH, DELETE | CRUD single workflow |
| `/api/workflows/[id]/run` | POST | Execute workflow manually |
| `/api/workflows/[id]/ingest-event` | POST | Webhook for event triggers |
| `/api/workflows/runs` | GET | List workflow runs |
| `/api/agent/sessions` | POST | Create AI agent session |
| `/api/agent/sessions/[id]/messages` | GET, POST | Session messages |

### Hooks & Components Cheat Sheet

```tsx
// From @membranehq/react

// List all available integrations (in your workspace)
const { items, loading } = useIntegrations();

// List user's connections
const { items, loading } = useConnections();

// List actions for an integration
const { items, loading } = useActions({ integrationKey: "slack" });

// Get single action details
const { data } = useAction({ id: "send-message", integrationKey: "slack" });

// Get single integration details
const { data } = useIntegration({ key: "hubspot" });

// Access UI triggers and API methods
const integrationApp = useIntegrationApp();

// Open connection UI
await integrationApp.integration("slack").openNewConnection();
await integrationApp.connection(connId).open();

// Search app catalog (external apps)
const response = await integrationApp.get("external-apps", {
  search: "slack",
  limit: 50,
});
const apps = response.items; // App[]

// Create integration from external app
const newIntegration = await integrationApp.integrations.create({
  name: app.name,
  logoUri: app.logoUri,
  appUuid: app.uuid,
  connectorId: app.defaultConnectorId,
  key: app.key,
});
```

---

## Appendix: Complete Code Patterns

### Token Generation (Full)

```typescript
// lib/membrane/token.ts

import jwt from "jsonwebtoken";

interface TokenConfig {
  customerId: string;
  customerName: string;
  isAdmin?: boolean;
  expiresInSeconds?: number;
}

export function generateMembraneToken(config: TokenConfig): string {
  const {
    customerId,
    customerName,
    isAdmin = false,
    expiresInSeconds = 7200,
  } = config;

  return jwt.sign(
    {
      iss: process.env.MEMBRANE_WORKSPACE_KEY,
      id: customerId,
      name: customerName,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
      isAdmin,
    },
    process.env.MEMBRANE_WORKSPACE_SECRET!,
    { algorithm: "HS512" }
  );
}

// With caching
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export function getOrCreateToken(config: TokenConfig): string {
  const cacheKey = `${config.customerId}:${config.isAdmin}`;
  const cached = tokenCache.get(cacheKey);
  
  // Return cached if valid for at least 5 more minutes
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.token;
  }

  const token = generateMembraneToken(config);
  const expiresInSeconds = config.expiresInSeconds || 7200;
  
  tokenCache.set(cacheKey, {
    token,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  });

  return token;
}
```

### Variable Resolution (Full)

```typescript
// lib/workflow/variable-resolver.ts

type VariableRef = { $var: string };

export function isVariableRef(value: unknown): value is VariableRef {
  return (
    typeof value === "object" &&
    value !== null &&
    "$var" in value &&
    typeof (value as VariableRef).$var === "string"
  );
}

export function resolveVariables<T>(
  input: T,
  context: Record<string, unknown>
): T {
  if (isVariableRef(input)) {
    return resolvePath(input.$var, context) as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => resolveVariables(item, context)) as T;
  }

  if (typeof input === "object" && input !== null) {
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      resolved[key] = resolveVariables(value, context);
    }
    return resolved as T;
  }

  return input;
}

export function resolvePath(
  path: string,
  context: Record<string, unknown>
): unknown {
  // Remove leading "$." if present
  const normalizedPath = path.replace(/^\$\.?/, "");
  const parts = normalizedPath.split(".");

  let current: unknown = context;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return null;
    }

    if (typeof current !== "object") {
      return null;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

// For resolving variables in prompt strings (e.g., "Hello {{name}}")
export function resolvePromptVariables(
  prompt: string,
  context: Record<string, unknown>
): string {
  return prompt.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const value = resolvePath(path.trim(), { "Previous Steps": context });
    return value !== null && value !== undefined ? String(value) : "";
  });
}
```

### Node Validation (Full)

```typescript
// lib/workflow/node-validation.ts

export function isNodeConfigured(node: WorkflowNode): boolean {
  switch (node.nodeType) {
    case "manual":
      return true; // Always valid
      
    case "event":
      return isEventTriggerConfigured(node.config);
      
    case "action":
      return isActionNodeConfigured(node.config);
      
    case "http":
      return isHttpNodeConfigured(node.config);
      
    case "ai":
      return isAINodeConfigured(node.config);
      
    case "gate":
      return isGateNodeConfigured(node.config);
      
    default:
      return false;
  }
}

function isEventTriggerConfigured(config: EventTriggerConfig): boolean {
  if (!config.integrationKey || !config.eventType) return false;
  
  if (config.eventSource === "data-record") {
    return !!config.dataCollection;
  }
  
  if (config.eventSource === "connector") {
    return !!config.connectorEventKey;
  }
  
  return false;
}

function isActionNodeConfigured(config: ActionNodeConfig): boolean {
  return !!config.integrationKey && !!config.actionId;
}

function isHttpNodeConfigured(config: HttpNodeConfig): boolean {
  const mapping = config.inputMapping;
  return !!mapping?.uri && !!mapping?.method;
}

function isAINodeConfigured(config: AINodeConfig): boolean {
  return !!config.prompt && config.prompt.trim().length > 0;
}

function isGateNodeConfigured(config: GateNodeConfig): boolean {
  const condition = config.condition;
  return (
    !!condition?.field &&
    !!condition?.operator &&
    condition?.value !== undefined
  );
}
```

### Workflow Context (Full)

```typescript
// context/workflow-context.tsx

"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface WorkflowContextValue {
  workflow: Workflow | null;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  saveNodes: (nodes: WorkflowNode[]) => Promise<void>;
  saveWorkflowName: (name: string) => Promise<void>;
  activateWorkflow: () => Promise<void>;
  deactivateWorkflow: () => Promise<void>;
  refresh: () => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

export function WorkflowProvider({
  workflowId,
  children,
}: {
  workflowId: string;
  children: React.ReactNode;
}) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/workflows/${workflowId}`);
    const data = await res.json();
    setWorkflow(data);
  }, [workflowId]);

  const saveNodes = useCallback(
    async (nodes: WorkflowNode[]) => {
      await fetch(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes }),
      });
      await refresh();
    },
    [workflowId, refresh]
  );

  const saveWorkflowName = useCallback(
    async (name: string) => {
      await fetch(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      await refresh();
    },
    [workflowId, refresh]
  );

  const activateWorkflow = useCallback(async () => {
    await fetch(`/api/workflows/${workflowId}/activate`, { method: "POST" });
    await refresh();
  }, [workflowId, refresh]);

  const deactivateWorkflow = useCallback(async () => {
    await fetch(`/api/workflows/${workflowId}/deactivate`, { method: "POST" });
    await refresh();
  }, [workflowId, refresh]);

  const deleteNode = useCallback(
    async (nodeId: string) => {
      if (!workflow) return;
      const updatedNodes = workflow.nodes.filter((n) => n.id !== nodeId);
      await saveNodes(updatedNodes);
    },
    [workflow, saveNodes]
  );

  return (
    <WorkflowContext.Provider
      value={{
        workflow,
        selectedNodeId,
        setSelectedNodeId,
        saveNodes,
        saveWorkflowName,
        activateWorkflow,
        deactivateWorkflow,
        refresh,
        deleteNode,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useWorkflow must be used within WorkflowProvider");
  }
  return context;
}
```

---

## Common Pitfalls

Common issues to watch out for when integrating Membrane:
## Best Practices

### 1. API/UI URLs
Essential patterns for a correct Membrane integration:

Membrane uses specific URLs for API and UI endpoints:
### 1. Environment Variables

```env
MEMBRANE_API_URI=https://api.getmembrane.com
MEMBRANE_UI_URI=https://ui.getmembrane.com
# Required for SDK (IntegrationAppClient)
MEMBRANE_API_URI=https://api.integration.app

# Required for UI (IntegrationAppProvider)
MEMBRANE_UI_URI=https://app.integration.app

# Workspace credentials
MEMBRANE_WORKSPACE_KEY=your-workspace-key
MEMBRANE_WORKSPACE_SECRET=your-workspace-secret
```

**Symptom**: 404 errors on API calls indicate incorrect URLs.
### 2. JWT Token Generation

The JWT must include the `id` claim with the **actual user ID** who owns the connection:

```typescript
import { SignJWT } from "jose";

async function generateMembraneToken(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.MEMBRANE_WORKSPACE_SECRET);
  
  return await new SignJWT({
    iss: process.env.MEMBRANE_WORKSPACE_KEY,
    id: userId,  // The actual user ID who owns the connection
    name: "Workflow Execution",
  })
    .setProtectedHeader({ alg: "HS512" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}
```

### 2. JWT Customer ID Claim
### 3. Server-Side Action Execution

Membrane expects the customer ID in the `id` claim:
Always use the `@membranehq/sdk` for executing actions:

```typescript
jwt.sign({
  iss: process.env.MEMBRANE_WORKSPACE_KEY,
  id: customerId,
  name: customerName,
  ...
import { IntegrationAppClient } from "@membranehq/sdk";

const client = new IntegrationAppClient({
  token,
  apiUri: process.env.MEMBRANE_API_URI,
});

const result = await client
  .action(actionId)
  .run(actionInput, { connectionId });
```

**Symptom**: OAuth errors mentioning "customer id should be provided in access token".
### 4. Passing User ID Through Workflow Execution

### 3. Action Identifier Field
The user ID must flow from your API route through to the step execution:

Actions returned from `useActions()` use the `id` field for identification:
```typescript
// 1. API route - extract user ID
const session = await auth();
executeWorkflow({
  nodes, edges, executionId, workflowId,
  userId: session.user.id,
});

```tsx
{actions?.map((action) => (
  <option key={action.id} value={action.id}>
    {action.name}
  </option>
))}
```
// 2. Workflow executor - include in step context
const stepContext = { executionId, nodeId, userId };

**Symptom**: Empty action dropdown despite actions being loaded.
// 3. Step function - use for token generation
const token = await generateMembraneToken(context.userId);
```

### 4. Filtering Connections by Integration
### 5. Action Selection UI

Connections should be filtered by the selected integration:
Use `action.id` for selection and filter connections by integration:

```tsx
const { items: connections } = useConnections();
const filteredConnections = connections?.filter(
  (conn) => conn.integration?.key === selectedIntegrationKey
);
```

**Symptom**: Connections for other apps appearing in the dropdown.
// Action selection
{actions?.map((action) => (
  <option key={action.id} value={action.id}>{action.name}</option>
))}
```

### 5. Config Update Race Conditions
### 6. Config Updates in React

When updating multiple config fields, batch them or handle sequentially:
Use a single `onUpdateConfig` call per handler, and `useEffect` for dependent field updates:

```tsx
const handleIntegrationChange = (key: string) => {
  // Option 1: Update one field at a time
  onUpdateConfig("membraneIntegrationKey", key);
  
  // Option 2: Use a batch update function if available
  onBatchUpdate({
    membraneIntegrationKey: key,
    membraneConnectionId: "",
    membraneActionId: "",
  });
const handleActionChange = (actionId: string) => {
  onUpdateConfig("membraneActionId", actionId);
};
```

**Symptom**: Config values not persisting or being overwritten.
useEffect(() => {
  if (selectedAction?.key && config?.membraneActionKey !== selectedAction.key) {
    onUpdateConfig("membraneActionKey", selectedAction.key);
  }
}, [selectedAction, config?.membraneActionKey, onUpdateConfig]);
```

<details>
<summary><strong>Agent Spec: Common Pitfalls</strong></summary>
<summary><strong>Agent Spec: Best Practices</strong></summary>

```json
{
  "pitfalls": [
  "best_practices": [
    {
      "topic": "Environment URLs",
      "rule": "Use api.integration.app for SDK, app.integration.app for UI"
    },
    {
      "topic": "JWT Generation",
      "rule": "Use jose library with HS512 algorithm, include actual user ID in 'id' claim"
    },
    {
      "issue": "Incorrect URLs",
      "symptom": "404 errors on API calls",
      "solution": "Use api.getmembrane.com and ui.getmembrane.com"
      "topic": "Action Execution",
      "rule": "Always use @membranehq/sdk IntegrationAppClient"
    },
    {
      "issue": "JWT claim",
      "symptom": "OAuth error about customer id",
      "solution": "Use 'id' claim for customer identifier"
      "topic": "User ID Flow",
      "rule": "Pass session.user.id from API route → executor → step context → JWT"
    },
    {
      "issue": "Action field",
      "symptom": "Action dropdown empty despite actions loading",
      "solution": "Use action.id for identification"
      "topic": "Connection Filtering",
      "rule": "Filter by conn.integration?.key === selectedIntegrationKey"
    },
    {
      "issue": "Unfiltered connections",
      "symptom": "Wrong connections shown for selected app",
      "solution": "Filter by conn.integration?.key === selectedIntegrationKey"
      "topic": "React Config Updates",
      "rule": "Single onUpdateConfig per handler, useEffect for dependent updates"
    }
  ]
}
```

</details>

---

## Summary

Integrating Membrane into your workflow builder involves:

1. **Quick Start** (~30 min): Token endpoint + provider setup
2. **Core Integration**: App actions with connection UI, action selection, and input mapping
3. **Event-Driven**: Webhook ingestion for event-triggered workflows
4. **Advanced Nodes**: HTTP, AI, and Gate nodes for flexible workflows
5. **Self-Integration**: AI-powered custom connector building
6. **Execution Engine**: Reliable workflow runs with durable execution

The key insight: Membrane handles the hard parts (OAuth, API connections, action catalog), while you build the workflow UX your users need.

For questions or support, see the [Membrane documentation](https://docs.getmembrane.com) or reach out to the Membrane team.
