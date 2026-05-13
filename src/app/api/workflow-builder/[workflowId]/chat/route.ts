import { streamText, stepCountIs, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { NextRequest } from 'next/server';

import { getAuthenticationFromRequest } from '@/lib/auth';
import { generateIntegrationToken } from '@/lib/integration-token';
import { connectToDatabase } from '@/lib/workflow/database';
import { Workflow } from '@/lib/workflow/models/workflow';

const MEMBRANE_API = process.env.NEXT_PUBLIC_INTEGRATION_APP_API_URL ?? 'https://api.integration.app';

const SYSTEM_PROMPT = `You are a workflow automation builder for Membrane, an integration platform.
Your job is to help users create workflow automations by configuring nodes in their workflow.

A workflow consists of:
- ONE trigger node: "manual" (user clicks run) or "event" (triggered by an external app event)
- Action nodes (in order): "membrane_action" (calls a connected app), "http" (makes an HTTP request), "ai" (AI text processing), "gate" (conditional branching)

YOUR PROCESS:
1. Understand the user's automation goal
2. Call list_connections to see what apps are already connected
3. Call search_actions or list_connection_actions to find the right actions for each step
4. If a required app isn't connected yet, call request_connection — do NOT proceed until the user confirms
5. Get action details with get_action_details to understand each action's input/output schema
6. Explain your plan clearly, then build the workflow node by node
7. Use set_trigger first, then add_action_node for each subsequent step
8. Wire data between nodes using inputMapping with dot-path references:
   - "$.trigger.fieldName" → output from the trigger node
   - "$.Node Name.fieldName" → a field from a previous action node named "Node Name"

IMPORTANT RULES:
- Always call list_connections before recommending any app
- Always call get_action_details before configuring a node — you need the exact field names from inputSchema
- inputMapping keys must exactly match the action's inputSchema property names
- One trigger node only; add multiple action nodes for multi-step workflows
- Ask the user to clarify before building if their request is ambiguous`;

export async function POST(request: NextRequest, { params }: { params: Promise<{ workflowId: string }> }) {
  const auth = getAuthenticationFromRequest(request);
  if (!auth) {
    return new Response('Authentication required', { status: 401 });
  }

  const { workflowId } = await params;
  const body = await request.json();
  const { messages } = body;

  const token = await generateIntegrationToken(auth);

  const membraneApi = async (path: string): Promise<unknown> => {
    const res = await fetch(`${MEMBRANE_API}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Membrane API ${path}: ${res.status} — ${text}`);
    }
    return res.json();
  };

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: SYSTEM_PROMPT,
    messages,
    stopWhen: stepCountIs(25),
    tools: {
      list_connections: tool({
        description:
          'List all apps the user has already connected. Always call this first to understand what integrations are available.',
        inputSchema: z.object({}),
        execute: async () => {
          const data = (await membraneApi('/connections?limit=100')) as {
            items?: Array<{
              id: string;
              name?: string;
              integration?: { key?: string; name?: string };
            }>;
          };
          return (data.items ?? []).map((c) => ({
            id: c.id,
            name: c.name ?? c.integration?.name ?? c.id,
            integrationKey: c.integration?.key,
            integrationName: c.integration?.name,
          }));
        },
      }),

      search_actions: tool({
        description:
          'Search for available actions by intent. Use this to find relevant actions for a specific task.',
        inputSchema: z.object({
          query: z.string().describe('Natural language description of what you want to do, e.g. "create a contact"'),
          connectionId: z
            .string()
            .optional()
            .describe('Limit results to a specific connection ID when you know which app to use'),
        }),
        execute: async (params: { query: string; connectionId?: string }) => {
          const qs = new URLSearchParams({ elementType: 'action', q: params.query });
          if (params.connectionId) qs.set('connectionId', params.connectionId);
          const data = (await membraneApi(`/search?${qs}`)) as {
            items?: Array<{
              element: { id: string; key?: string; name?: string; description?: string; connectionId?: string };
            }>;
          };
          return (data.items ?? []).slice(0, 15).map((r) => ({
            id: r.element.id,
            key: r.element.key,
            name: r.element.name,
            description: r.element.description,
            connectionId: r.element.connectionId,
          }));
        },
      }),

      list_connection_actions: tool({
        description: 'List all actions available for a specific connected app.',
        inputSchema: z.object({
          connectionId: z.string().describe('The connection ID from list_connections'),
        }),
        execute: async (params: { connectionId: string }) => {
          const data = (await membraneApi(
            `/connections/${encodeURIComponent(params.connectionId)}/actions?limit=100`,
          )) as {
            items?: Array<{ id: string; key?: string; name?: string; description?: string }>;
          };
          return (data.items ?? []).map((a) => ({
            id: a.id,
            key: a.key,
            name: a.name,
            description: a.description,
          }));
        },
      }),

      get_action_details: tool({
        description:
          'Get the full input and output schema for a specific action. Always call this before adding a membrane_action node so you know exact field names for inputMapping.',
        inputSchema: z.object({
          actionId: z.string().describe('The action ID from search_actions or list_connection_actions'),
        }),
        execute: async (params: { actionId: string }) => {
          const data = (await membraneApi(`/actions/${encodeURIComponent(params.actionId)}`)) as {
            id: string;
            key?: string;
            name?: string;
            description?: string;
            inputSchema?: unknown;
            outputSchema?: unknown;
            connectionId?: string;
          };
          return {
            id: data.id,
            key: data.key,
            name: data.name,
            description: data.description,
            connectionId: data.connectionId,
            inputSchema: data.inputSchema,
            outputSchema: data.outputSchema,
          };
        },
      }),

      get_workflow: tool({
        description: 'Get the current state of the workflow being built, including all configured nodes.',
        inputSchema: z.object({}),
        execute: async () => {
          await connectToDatabase();
          const workflow = await Workflow.findById(workflowId).lean();
          if (!workflow) throw new Error('Workflow not found');
          return {
            id: workflow._id.toString(),
            name: workflow.name,
            description: workflow.description,
            status: workflow.status,
            nodes: workflow.nodes,
          };
        },
      }),

      set_trigger: tool({
        description:
          'Set the workflow trigger node. Every workflow needs exactly one trigger — call this before adding action nodes.',
        inputSchema: z.object({
          name: z.string().describe('Human-readable name for the trigger, e.g. "New Deal Created"'),
          triggerType: z.enum(['manual', 'event']).describe(
            '"manual" = user clicks Run; "event" = fires when an external app event occurs',
          ),
          config: z
            .object({
              hasInput: z.boolean().optional(),
              inputSchema: z.record(z.unknown()).optional(),
              integrationKey: z.string().optional(),
              connectionId: z.string().optional(),
              eventType: z.string().optional(),
            })
            .optional(),
        }),
        execute: async (params: {
          name: string;
          triggerType: 'manual' | 'event';
          config?: {
            hasInput?: boolean;
            inputSchema?: Record<string, unknown>;
            integrationKey?: string;
            connectionId?: string;
            eventType?: string;
          };
        }) => {
          await connectToDatabase();
          const workflow = await Workflow.findById(workflowId);
          if (!workflow) throw new Error('Workflow not found');

          const triggerNode = {
            id: `trigger-${Date.now()}`,
            name: params.name,
            type: 'trigger' as const,
            triggerType: params.triggerType,
            config: params.config ?? {},
            ready: true,
          };

          workflow.nodes = [triggerNode, ...workflow.nodes.filter((n) => n.type !== 'trigger')];
          await workflow.save();
          return { success: true, node: triggerNode };
        },
      }),

      add_action_node: tool({
        description: 'Add an action node to the workflow. Nodes execute in the order they are added.',
        inputSchema: z.object({
          name: z.string().describe('Human-readable name for this step, e.g. "Create Contact in Salesforce"'),
          nodeType: z.enum(['membrane_action', 'http', 'ai', 'gate']),
          config: z
            .object({
              actionId: z.string().optional(),
              connectionId: z.string().optional(),
              integrationKey: z.string().optional(),
              inputMapping: z.record(z.unknown()).optional(),
              url: z.string().optional(),
              method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
              headers: z.record(z.string()).optional(),
              body: z.record(z.unknown()).optional(),
              prompt: z.string().optional(),
              outputSchema: z.record(z.unknown()).optional(),
              condition: z
                .object({
                  field: z.string(),
                  operator: z.enum(['equals', 'not_equals']),
                  value: z.string(),
                })
                .optional(),
            })
            .optional(),
        }),
        execute: async (params: {
          name: string;
          nodeType: 'membrane_action' | 'http' | 'ai' | 'gate';
          config?: Record<string, unknown>;
        }) => {
          await connectToDatabase();
          const workflow = await Workflow.findById(workflowId);
          if (!workflow) throw new Error('Workflow not found');

          const node = {
            id: `${params.nodeType}-${Date.now()}`,
            name: params.name,
            type: 'action' as const,
            nodeType: params.nodeType,
            config: params.config ?? {},
            ready: true,
          };

          workflow.nodes.push(node);
          await workflow.save();
          return { success: true, node };
        },
      }),

      update_node: tool({
        description: 'Update an existing workflow node.',
        inputSchema: z.object({
          nodeId: z.string(),
          name: z.string().optional(),
          config: z.record(z.unknown()).optional(),
        }),
        execute: async (params: { nodeId: string; name?: string; config?: Record<string, unknown> }) => {
          await connectToDatabase();
          const workflow = await Workflow.findById(workflowId);
          if (!workflow) throw new Error('Workflow not found');

          const idx = workflow.nodes.findIndex((n) => n.id === params.nodeId);
          if (idx === -1) throw new Error(`Node "${params.nodeId}" not found`);

          if (params.name) workflow.nodes[idx].name = params.name;
          if (params.config) {
            workflow.nodes[idx].config = { ...(workflow.nodes[idx].config ?? {}), ...params.config };
          }

          await workflow.save();
          return { success: true, node: workflow.nodes[idx] };
        },
      }),

      remove_node: tool({
        description: 'Remove a node from the workflow.',
        inputSchema: z.object({
          nodeId: z.string(),
        }),
        execute: async (params: { nodeId: string }) => {
          await connectToDatabase();
          const workflow = await Workflow.findById(workflowId);
          if (!workflow) throw new Error('Workflow not found');

          workflow.nodes = workflow.nodes.filter((n) => n.id !== params.nodeId);
          await workflow.save();
          return { success: true };
        },
      }),

      request_connection: tool({
        description:
          'Call this when the user needs to connect an app before you can proceed. The UI will show a Connect button. Wait for the user to confirm before continuing.',
        inputSchema: z.object({
          integrationKey: z.string().describe('Integration key e.g. "hubspot", "salesforce", "slack"'),
          appName: z.string().describe('Human-readable app name'),
          reason: z.string().describe('One sentence explaining why this connection is needed'),
        }),
        execute: async (params: { integrationKey: string; appName: string; reason: string }) => ({
          type: 'connection_required' as const,
          integrationKey: params.integrationKey,
          appName: params.appName,
          reason: params.reason,
        }),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
