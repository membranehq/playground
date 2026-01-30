# Integrating Membrane into Your Workflow Builder

This guide walks you through integrating Membrane into a workflow builder application. By the end, your users will be able to connect any external app and take any actions in them supported by their API.

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

This section assumes you have completed the basic Membrane setup. If not, complete these steps first:

1. **Install dependencies** - See [Getting Started](https://docs.getmembrane.com/docs/getting-started)
2. **Set up environment variables** - `MEMBRANE_WORKSPACE_KEY`, `MEMBRANE_WORKSPACE_SECRET`, and API URLs
3. **Implement token generation** - See [Authentication](https://docs.getmembrane.com/docs/Membrane%20Engine/authentication)
4. **Add MembraneProvider** - See [React SDK](https://docs.getmembrane.com/docs/References/front-end/react)

### Your First Trigger → Action Workflow

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

The following sections explain what data to store and how to execute actions.

### What are Membrane Actions?

Actions are single, synchronous requests to external apps - things like "Send a Slack message", "Create a HubSpot contact", or "Get a list of Notion pages". Each action has:

- **inputSchema** - defines what data the action needs (e.g., channel, message text)
- **outputSchema** - defines what data the action returns

Actions are scoped to integrations (apps) and require a connection (authenticated user credentials) to execute. See [Actions](https://docs.getmembrane.com/docs/Integration%20Layer/actions) in the Membrane docs.

### Action Node Data Model

Your workflow's action nodes need to store these fields to execute a Membrane action:

| Field | Type | Description |
|-------|------|-------------|
| `integrationKey` | string | The app identifier (e.g., `"slack"`, `"hubspot"`) |
| `connectionId` | string | The user's connection ID for this app |
| `actionId` | string | The specific action to execute (e.g., `"send-message"`) |
| `actionInput` | object/string | Input data for the action, may include variable references |

### Membrane Hooks for Configuration

Use these hooks from `@membranehq/react` to populate your UI:

```typescript
// Get available apps
const { items: integrations } = useIntegrations();

// Get user's connections (filter by integration)
const { items: connections, refresh: refreshConnections } = useConnections();
const filteredConnections = connections?.filter(
  (conn) => conn.integration?.key === selectedIntegrationKey
);

// Get actions for selected app
const { items: actions } = useActions({ integrationKey: selectedIntegrationKey });

// Get action details (including inputSchema)
const { data: action } = useAction({ id: actionId, integrationKey });
```

To create or manage connections, use `useMembrane()`:

```typescript
const membrane = useMembrane();

// Open OAuth/connection flow (Membrane handles the UI)
const connection = await membrane
  .integration(integrationKey)
  .openNewConnection();

// Reconnect existing connection
await membrane.connection(connectionId).openReconnectUI();

// Delete connection
await membrane.connection(connectionId).archive();
```

See [React SDK Hooks](https://docs.getmembrane.com/docs/References/front-end/react/hooks) for full API details.

### Server-Side Action Execution

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

There are two types of apps in Membrane:

1. **Integrations** - Apps already added to your workspace (use `useIntegrations()`)
2. **External Apps** - Membrane's full app catalog for discovering new apps

#### Fetching External Apps

Use `useMembrane()` to search the app catalog:

```typescript
const membrane = useMembrane();

// Search the app catalog
const response = await membrane.get("external-apps", {
  search: "slack",
  limit: 50,
});
const apps = response.items; // App[]
```

Each app in the catalog has:
- `uuid` - Unique identifier
- `key` - App key for integration creation
- `name` - Display name
- `logoUri` - App logo URL
- `defaultConnectorId` - Connector to use

#### Creating an Integration from an External App

When a user selects an app from the catalog, create an integration in your workspace:

```typescript
const membrane = useMembrane();

const newIntegration = await membrane.integrations.create({
  name: app.name,
  logoUri: app.logoUri,
  appUuid: app.uuid,
  connectorId: app.defaultConnectorId,
  key: app.key,
});
```

See [External Apps](https://docs.getmembrane.com/docs/Integration%20Layer/external-apps) in the Membrane docs.

### Connections

Use `useConnections()` to list the user's connections and `useMembrane()` to create new ones:

```typescript
// List connections
const { items: connections } = useConnections();

// Filter by integration
const slackConnections = connections?.filter(
  (conn) => conn.integration?.key === "slack"
);

// Create new connection (opens Membrane's OAuth UI)
const membrane = useMembrane();
const connection = await membrane.integration("slack").openNewConnection();

// Reconnect existing connection
await membrane.connection(connectionId).openReconnectUI();
```

See [Connections](https://docs.getmembrane.com/docs/Integration%20Layer/connections) in the Membrane docs.

### Actions

Use `useActions()` to list available actions for an integration:

```typescript
// List actions
const { items: actions } = useActions({ integrationKey: "slack" });

// Get action details (including inputSchema/outputSchema)
const { data: action } = useAction({ id: actionId, integrationKey: "slack" });
```

Each action has:
- `id` - Action identifier (use this for execution)
- `key` - Action key
- `name` - Display name
- `description` - What the action does
- `inputSchema` - JSON Schema for required inputs
- `outputSchema` - JSON Schema for action output

See [Actions](https://docs.getmembrane.com/docs/Integration%20Layer/actions) in the Membrane docs.

### Input Mapping

Workflows pass data between nodes using variable references. Store input mappings that reference outputs from previous steps:

```typescript
// Variable reference format
{ "$var": "$.Previous Steps.Trigger.message" }

// Example input mapping for a Slack action
{
  "channel": "#general",
  "text": { "$var": "$.Previous Steps.Trigger.message" }
}
```

At execution time, resolve these references by walking the path through accumulated node outputs.

### Executing Actions

Use the `@membranehq/sdk` to execute actions server-side:

```typescript
import { IntegrationAppClient } from "@membranehq/sdk";

const client = new IntegrationAppClient({ token: membraneToken });

const result = await client
  .connection(connectionId)
  .action(actionId)
  .run(resolvedInput);
```

See [Running Actions](https://docs.getmembrane.com/docs/Integration%20Layer/actions#running-actions) in the Membrane docs.

---

## Self-Integration

Self-Integration lets users connect **any app** - even ones without pre-built Membrane integrations - by using AI to build custom connectors on-demand.

### Why Self-Integration Matters

- **No integration gaps**: Users aren't limited to pre-built connectors
- **Zero wait time**: No need to request and wait for new integrations
- **Custom apps**: Works with internal tools and niche SaaS products
- **AI-powered**: Automatically reads API docs and builds the connector

### Implementation

To implement self-integration, you need:

1. **User input**: Collect the app name and URL (or API docs URL)
2. **AI agent session**: Create a session with Membrane's AI agent
3. **Prompt**: Send a prompt asking the agent to build the connector

The AI agent will:
1. Analyze the app's API documentation
2. Create a connector with authentication
3. Add common actions (CRUD operations)
4. Make the integration available in your workspace

See [AI Agents](https://docs.getmembrane.com/docs/Integration%20Experiences/ai-agents) in the Membrane docs for details on working with Membrane's AI capabilities.

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

### Hooks Cheat Sheet

```typescript
// From @membranehq/react

// List available integrations
const { items, loading } = useIntegrations();

// List user's connections
const { items, loading } = useConnections();

// List actions for an integration
const { items, loading } = useActions({ integrationKey: "slack" });

// Get single action details
const { data } = useAction({ id: "send-message", integrationKey: "slack" });

// Access SDK methods
const membrane = useMembrane();

// Open connection UI
await membrane.integration("slack").openNewConnection();
await membrane.connection(connId).openReconnectUI();

// Search app catalog
const response = await membrane.get("external-apps", { search: "slack" });

// Create integration from external app
await membrane.integrations.create({
  name: app.name,
  logoUri: app.logoUri,
  appUuid: app.uuid,
  connectorId: app.defaultConnectorId,
  key: app.key,
});
```

See [React SDK Reference](https://docs.getmembrane.com/docs/References/front-end/react) for full details.

---

## Appendix: Workflow-Specific Patterns

These patterns are specific to workflow builder implementations and not covered in Membrane's documentation.

### Variable Resolution

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
