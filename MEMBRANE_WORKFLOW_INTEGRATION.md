# Integrating Membrane into Your Workflow Builder

This guide covers how to integrate Membrane into a workflow builder application, enabling your users to connect external apps and execute actions within their workflows.

## Table of Contents

1. [Introduction](#introduction)
2. [Setup](#setup)
3. [Integrations & External Apps](#integrations--external-apps)
4. [Connections](#connections)
5. [Actions](#actions)
6. [Self-Integration](#self-integration)
7. [Events](#events)

---

## Introduction

Membrane enables your workflow builder to:

- **Let users connect any app** - Users authenticate with external apps (Slack, HubSpot, Notion, etc.) through Membrane's connection UI (OAuth, API keys, etc.)
- **Add app actions to workflows** - Users select from pre-built actions (send message, create record, get data) to add as workflow steps
- **Execute actions at runtime** - Your workflow engine calls Membrane's SDK to run actions on behalf of users
- **Trigger workflows from external events** - Start workflows when something happens in a connected app (new record created, message received, etc.)
- **Connect custom apps** - Users can add integrations for any app with an API using AI-powered connector building

---

## Setup

Before using Membrane APIs, complete the initial setup:

1. **Install dependencies** - `npm install @membranehq/sdk @membranehq/react`
2. **Configure environment variables** - Set `MEMBRANE_WORKSPACE_KEY` and `MEMBRANE_WORKSPACE_SECRET`
3. **Implement token generation** - Create a backend endpoint that generates JWT tokens for Membrane API access
4. **Add MembraneProvider** - Wrap your app with the provider and pass a `fetchToken` function

For detailed setup instructions, see:
- [Getting Started](https://docs.getmembrane.com/docs/connecting-external-apps)
- [Authentication](https://docs.getmembrane.com/docs/authentication)
- [React SDK](https://docs.getmembrane.com/docs/react-sdk)

---

## Integrations & External Apps

When users create a new connection, they first select which app to connect. **Integrations** are apps already available in your workspace. **External Apps** let users browse Membrane's full catalog to add new apps to the workspace.

### Listing Integrations

Use `useIntegrations()` to fetch apps available in your workspace. See [Integrations](https://docs.getmembrane.com/docs/integrations) and [React SDK](https://docs.getmembrane.com/docs/react-sdk).

### Adding External Apps

To let users add new apps from Membrane's catalog, use the `external-apps` API to search and `integrations.create()` to add them to your workspace. See [External Apps](https://docs.getmembrane.com/docs/external-apps) and [JavaScript SDK](https://docs.getmembrane.com/docs/javascript-sdk).

```typescript
const membrane = useMembrane();

// Search the app catalog
const response = await membrane.get("external-apps", { search: "slack" });
const apps = response.items;

// Add selected app to workspace
const newIntegration = await membrane.integrations.create({
  name: app.name,
  logoUri: app.logoUri,
  appUuid: app.uuid,
  connectorId: app.defaultConnectorId,
  key: app.key,
});
```

---

## Connections

A **Connection** represents a user's authenticated account with an external app. Before users can add actions to their workflows, they need to connect their accounts.

To create a new connection, use `integration.openNewConnection()` which launches Membrane's authentication UI. Use `useConnections()` to list existing connections and `useMembrane()` to reconnect or delete them. When configuring an action node, filter connections by integration to show only relevant ones.

See [Connections](https://docs.getmembrane.com/docs/connections), [Connection UI](https://docs.getmembrane.com/docs/connection-ui), and [React SDK](https://docs.getmembrane.com/docs/react-sdk).

---

## Actions

**Actions** are operations users can add to their workflows - things like "Send a Slack message", "Create a HubSpot contact", or "Get Notion pages". Each action has an `inputSchema` defining required inputs and an `outputSchema` defining what it returns.

### Listing Actions

Use `useActions()` to fetch available actions for an integration or connection:

```typescript
const { items: actions } = useActions({ integrationKey: "slack" });
// or
const { items: actions } = useActions({ connectionId: "conn_123" });
```

### Action Input Schema

Use `useAction()` to get the full action details including its input schema. This lets you build a form for users to configure the action inputs:

```typescript
const { data: action } = useAction({ 
  id: actionId, 
  integrationKey: "slack" 
});

// action.inputSchema - JSON Schema for required inputs
// action.outputSchema - JSON Schema for action output
```

### Executing Actions

When a workflow runs, execute actions server-side using the SDK:

```typescript
import { MembraneClient } from "@membranehq/sdk";

const client = new MembraneClient({ token: membraneToken });

const result = await client
  .connection(connectionId)
  .action(actionId)
  .run(actionInput);
```

**Important:** The JWT token must include the user ID of the connection owner in the `id` claim. See [Authentication](https://docs.getmembrane.com/docs/authentication).

For actions that read/write data, you may also need [Data Sources](https://docs.getmembrane.com/docs/data-sources) and [Field Mappings](https://docs.getmembrane.com/docs/field-mappings).

See [Actions](https://docs.getmembrane.com/docs/actions) and [React SDK](https://docs.getmembrane.com/docs/react-sdk).

---

## Self-Integration

Self-Integration lets users connect apps that don't have pre-built integrations by using AI to build custom connectors on-demand.

### Use Cases

- Internal tools and custom APIs
- Niche SaaS products not in the app catalog
- Apps with unique authentication requirements

### Creating an Agent Session

Start a session with an initial prompt describing what integration to build:

```typescript
const response = await fetch(`${MEMBRANE_API_URI}/agent/sessions`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${membraneToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: `Build a connector for Acme CRM (https://acme.com/api/docs)`,
  }),
});

const { id: sessionId } = await response.json();
```

### Checking Session Status

Poll the session to know when the agent has finished:

```typescript
const response = await fetch(
  `${MEMBRANE_API_URI}/agent/sessions/${sessionId}`,
  {
    headers: { Authorization: `Bearer ${membraneToken}` },
  }
);

const { state } = await response.json();
// state: 'busy' | 'idle'
```

The API supports long polling to avoid frequent requests:

```typescript
// Wait up to 50 seconds for status change
const url = `${MEMBRANE_API_URI}/agent/sessions/${sessionId}?wait=1&timeout=50`;
```

### Fetching Session Messages

Retrieve the conversation to display progress to users:

```typescript
const response = await fetch(
  `${MEMBRANE_API_URI}/agent/sessions/${sessionId}/messages`,
  {
    headers: { Authorization: `Bearer ${membraneToken}` },
  }
);

const { items } = await response.json();
// Each message has: id, role ('user' | 'assistant'), parts
```

### Building the UI

You need to build UI to show users the agent's progress. This could be:

- **Minimal**: A status indicator showing "Building integration..." / "Complete"
- **Verbose**: Display the full conversation with all agent messages

Poll the status endpoint while `state === 'busy'`, and fetch messages to show progress.

### Prebuilt UI

Coming soon - Membrane will provide embeddable UI components for agent sessions.

See [AI Agents](https://docs.getmembrane.com/docs/ai-agents) in the Membrane docs.

---

## Events

**Events** allow your workflows to be triggered by external apps - for example, starting a workflow when a new Slack message is received, a HubSpot deal is created, or a GitHub issue is opened.

### How Events Work

1. **User subscribes to an event** - Select an event type (e.g., "New Slack message in channel") and configure filters
2. **Membrane creates a webhook** - Membrane sets up the webhook with the external app
3. **Event occurs** - When something happens in the external app, it sends data to Membrane
4. **Your workflow is triggered** - Membrane forwards the event to your endpoint with the event payload

### Setting Up Event Subscriptions

Events are managed through **Flows** in Membrane. A Flow defines what event to listen for and where to send it:

```typescript
import { MembraneClient } from "@membranehq/sdk";

const client = new MembraneClient({ token: membraneToken });

// Create a flow that subscribes to an event
const flow = await client.flows.create({
  key: `workflow-trigger-${workflowId}`,
  name: "New Slack Message Trigger",
  integrationKey: "slack",
  // The event type to subscribe to
  triggerKey: "new-message",
  // Your webhook endpoint
  webhookUri: `${YOUR_API_BASE}/webhooks/membrane/${workflowId}`,
});
```

### Listing Available Events

Use the integration's available triggers to show users what events they can subscribe to:

```typescript
const { items: triggers } = await client
  .integration("slack")
  .triggers
  .list();

// Each trigger has: key, name, description, inputSchema
```

### Receiving Events

When an event occurs, Membrane sends a POST request to your webhook:

```typescript
// Your webhook endpoint
app.post('/webhooks/membrane/:workflowId', async (req, res) => {
  const { workflowId } = req.params;
  const eventPayload = req.body;
  
  // Start your workflow with the event data
  await startWorkflow(workflowId, {
    trigger: 'membrane_event',
    data: eventPayload,
  });
  
  res.status(200).send('OK');
});
```

### Managing Subscriptions

Enable, disable, or delete event subscriptions:

```typescript
// Disable a flow (pause event subscription)
await client.flow(flowId).patch({ enabled: false });

// Re-enable
await client.flow(flowId).patch({ enabled: true });

// Delete the subscription
await client.flow(flowId).archive();
```

See [Flows](https://docs.getmembrane.com/docs/flows) and [Events](https://docs.getmembrane.com/docs/events) in the Membrane docs.
