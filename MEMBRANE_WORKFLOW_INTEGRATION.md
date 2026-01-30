# Integrating Membrane into Your Workflow Builder

This guide walks you through integrating Membrane into a workflow builder application. By the end, your users will be able to connect any external app and take any actions in them supported by their API.

**Prerequisites**: Membrane account ([documentation](https://docs.getmembrane.com/docs/Overview)), familiarity with React/TypeScript, understanding of workflow builder concepts (nodes, edges, triggers, actions).

---

## Table of Contents

1. [Quick Start: Minimal Integration](#quick-start-minimal-integration)
2. [Core Integration: App Actions](#core-integration-app-actions)
3. [Self-Integration](#self-integration)
4. [Quick Reference](#quick-reference)

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

When workflows run, execute Membrane actions on the server using the `@membranehq/sdk`:

```typescript
import { IntegrationAppClient } from "@membranehq/sdk";

// Create client with JWT token (must include user ID in 'id' claim)
const client = new IntegrationAppClient({ token: membraneToken });

// Execute the action
const result = await client
  .connection(connectionId)
  .action(actionId)
  .run(actionInput);
```

**Important:** The JWT token must include the user ID of the connection owner in the `id` claim. See [Authentication](https://docs.getmembrane.com/docs/Membrane%20Engine/authentication) for token generation details.

---

## Core Integration: App Actions

This section covers the Membrane APIs for letting users add app actions to their workflows.

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

### Executing Actions

Use the `@membranehq/sdk` to execute actions server-side:

```typescript
import { IntegrationAppClient } from "@membranehq/sdk";

const client = new IntegrationAppClient({ token: membraneToken });

const result = await client
  .connection(connectionId)
  .action(actionId)
  .run(actionInput);
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

## Summary

Integrating Membrane into your workflow builder involves:

1. **Quick Start**: Set up MembraneProvider and authentication
2. **Core Integration**: Use Membrane hooks to fetch integrations, connections, and actions; execute actions server-side with the SDK
3. **Self-Integration**: Let users connect any app via AI-powered connector building

Membrane handles OAuth, API connections, and the action catalog - you integrate these into your existing workflow UI.

For questions or support, see the [Membrane documentation](https://docs.getmembrane.com).
