import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/workflow/database';
import { Workflow } from '@/lib/workflow/models/workflow';
import { updateNodesWithOutputSchemas } from '@/lib/workflow/output-schema-calculator';
import { IWorkflowNode } from '@/lib/workflow/models/workflow';
import { IntegrationAppClient } from '@membranehq/sdk';
import { getAuthenticationFromRequest } from '@/lib/auth';
import { generateIntegrationToken } from '@/lib/integration-token';
import {
  generateVerificationHashForWorkflowEvent,
  WORKFLOW_EVENT_VERIFICATION_HASH_HEADER,
} from '@/lib/workflow/workflow-event-verification';

/**
 * Get the event ingest URL for a workflow
 * This constructs the URL that will be used by Membrane to send events to our workflow
 */
function getEventIngestUrl(workflowId: string, request?: NextRequest): string {
  return `https://${process.env.APP_HOST_NAME || process.env.VERCEL_URL}/api/workflows/${workflowId}/ingest-event`;
}

/**
 * Valid event type values
 */
const VALID_EVENT_TYPES = [
  'data-record-created-trigger',
  'data-record-updated-trigger',
  'data-record-deleted-trigger',
  'connector-event-trigger',
] as const;

/**
 * Parameters for constructing flow instance nodes
 */
interface BuildFlowInstanceNodesParams {
  triggerType: (typeof VALID_EVENT_TYPES)[number];
  dataCollection: string;
  connectorEventKey: string | undefined;
  workflowId: string;
  request?: NextRequest;
}

/**
 * Build nodes for a flow instance
 * Shared between create and update operations
 */
function buildFlowInstanceNodes({
  triggerType,
  dataCollection,
  connectorEventKey,
  workflowId,
  request,
}: BuildFlowInstanceNodesParams): Record<string, unknown> {
  const isConnectorEvent = triggerType === 'connector-event-trigger';
  const triggerNodeKey = 'event-trigger-node';
  const triggerNodeName = 'Event Trigger Node';

  const triggerNodeConfig = isConnectorEvent
    ? { eventKey: connectorEventKey }
    : {
      dataSource: {
        collectionKey: dataCollection,
      },
    };

  const nodes: Record<string, unknown> = {
    [triggerNodeKey]: {
      name: triggerNodeName,
      type: triggerType,
      config: triggerNodeConfig,
      links: [{ key: 'send-update-to-my-app' }],
    },
  };

  // Add the API request node
  nodes['send-update-to-my-app'] = {
    type: 'api-request-to-your-app',
    name: 'Create Data Record in my App',
    config: {
      request: {
        body: {
          data: {
            $var: `$.input.${triggerNodeKey}`,
          },
          headers: {
            [WORKFLOW_EVENT_VERIFICATION_HASH_HEADER]: generateVerificationHashForWorkflowEvent(workflowId),
          },
        },
        method: 'POST',
        uri: getEventIngestUrl(workflowId, request),
      },
    },
    links: [],
    isCustomized: true,
  };

  return nodes;
}

/**
 * Create flow instance to source event for event trigger node
 * Returns the flow instance ID
 */
async function createFlowInstance(
  membrane: IntegrationAppClient,
  integrationKey: string,
  triggerType: (typeof VALID_EVENT_TYPES)[number],
  dataCollection: string,
  connectorEventKey: string | undefined,
  workflowId: string,
  request?: NextRequest,
): Promise<string | null> {
  const integration = await membrane.integration(integrationKey).get();

  if (!integration.id || !integration.connection?.id) {
    return null;
  }

  const flowInstanceName = `Event for workflowId: ${workflowId}`;
  const flowInstanceKey = `event-for-workflowId-${workflowId}-${Date.now()}`;

  const nodes = buildFlowInstanceNodes({
    triggerType,
    dataCollection,
    connectorEventKey,
    workflowId,
    request,
  });

  const flowInstance = await membrane.flowInstances.create({
    name: flowInstanceName,
    connectionId: integration.connection.id,
    integrationId: integration.id,
    instanceKey: flowInstanceKey,
    nodes: nodes as any,
  });

  return flowInstance.id || null;
}

/**
 * Delete flow instance by ID
 */
async function deleteFlowInstance(membrane: IntegrationAppClient, flowInstanceId: string): Promise<void> {
  try {
    await membrane.flowInstance(flowInstanceId).delete();
    console.log(`Deleted flow instance ${flowInstanceId}`);
  } catch (error) {
    console.error(`Failed to delete flow instance ${flowInstanceId}:`, error);
    // Continue even if deletion fails
  }
}

/**
 * Create flow instance for event trigger node
 * Returns the updated node with flowInstanceId
 */
async function createEventTriggerFlowInstance(
  node: IWorkflowNode,
  workflowId: string,
  membraneAccessToken: string,
  request?: NextRequest,
): Promise<IWorkflowNode> {
  if (node.type !== 'trigger' || node.triggerType !== 'event') {
    return node;
  }

  const config = node.config || {};
  const integrationKey = config.integrationKey as string;
  const dataCollection = config.dataCollection as string;
  const eventType = config.eventType as string;
  const connectorEventKey = config.connectorEventKey as string | undefined;

  const apiUri = process.env.MEMBRANE_API_URI || process.env.NEXT_PUBLIC_INTEGRATION_APP_API_URL || 'https://api.integration.app';
  const membrane = new IntegrationAppClient({
    token: membraneAccessToken,
    apiUri
  });

  const flowInstanceId = await createFlowInstance(
    membrane,
    integrationKey,
    eventType as (typeof VALID_EVENT_TYPES)[number],
    dataCollection || '',
    connectorEventKey,
    workflowId,
    request,
  );

  return {
    ...node,
    config: {
      ...config,
      flowInstanceId,
    },
  };
}

/**
 * Check if event trigger node has all required configuration fields
 */
function hasRequiredEventTriggerFields(node: IWorkflowNode): boolean {
  if (node.type !== 'trigger' || node.triggerType !== 'event') {
    return false;
  }

  const config = node.config || {};
  const eventSource = config.eventSource as 'connector' | 'data-record' | undefined;
  const isConnectorEvent = eventSource === 'connector';

  if (isConnectorEvent) {
    return !!(config.integrationKey && config.connectorEventKey && config.eventType);
  }
  return !!(config.integrationKey && config.dataCollection && config.eventType);
}

/**
 * Check if event trigger configuration changed between old and new nodes
 */
function hasEventTriggerConfigChanged(oldNode: IWorkflowNode, newNode: IWorkflowNode): boolean {
  const oldConfig = oldNode.config || {};
  const newConfig = newNode.config || {};

  // Check if any relevant field changed
  return (
    oldConfig.eventSource !== newConfig.eventSource ||
    oldConfig.integrationKey !== newConfig.integrationKey ||
    oldConfig.eventType !== newConfig.eventType ||
    oldConfig.dataCollection !== newConfig.dataCollection ||
    oldConfig.connectorEventKey !== newConfig.connectorEventKey
  );
}

/**
 * Update flow instance when event trigger configuration changes
 * Returns the updated node with flowInstanceId
 * Only deletes and recreates if integration changed, otherwise just patches nodes
 */
async function updateEventTriggerFlowInstance(
  oldNode: IWorkflowNode,
  newNode: IWorkflowNode,
  workflowId: string,
  membraneAccessToken: string,
  request?: NextRequest,
): Promise<IWorkflowNode> {
  const oldConfig = oldNode.config || {};
  const newConfig = newNode.config || {};
  const flowInstanceId = oldConfig.flowInstanceId as string | undefined;

  if (!flowInstanceId) {
    throw new Error('Flow instance ID not found in node config. Cannot update flow instance.');
  }

  const membrane = new IntegrationAppClient({
    token: membraneAccessToken,
    apiUri: process.env.MEMBRANE_API_URI || 'https://api.integration.app'
  });
  const oldIntegrationKey = oldConfig.integrationKey as string;
  const newIntegrationKey = newConfig.integrationKey as string;
  const dataCollection = newConfig.dataCollection as string;
  const eventType = newConfig.eventType as string;
  const connectorEventKey = newConfig.connectorEventKey as string | undefined;

  // If integration changed, delete old and create new
  if (oldIntegrationKey !== newIntegrationKey) {
    await deleteFlowInstance(membrane, flowInstanceId);

    const newFlowInstanceId = await createFlowInstance(
      membrane,
      newIntegrationKey,
      eventType as (typeof VALID_EVENT_TYPES)[number],
      dataCollection || '',
      connectorEventKey,
      workflowId,
      request,
    );

    return {
      ...newNode,
      config: {
        ...newConfig,
        flowInstanceId: newFlowInstanceId,
      },
    };
  }

  // Otherwise, just patch the nodes
  const nodes = buildFlowInstanceNodes({
    triggerType: eventType as (typeof VALID_EVENT_TYPES)[number],
    dataCollection: dataCollection || '',
    connectorEventKey,
    workflowId,
    request,
  });

  await membrane.flowInstance(flowInstanceId).patch({
    nodes: nodes as any,
  });

  return {
    ...newNode,
    config: {
      ...newConfig,
      flowInstanceId,
    },
  };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthenticationFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const { nodes } = await req.json();
    await connectToDatabase();

    const membraneAccessToken = await generateIntegrationToken(auth);

    // Get existing workflow to check if first node became ready
    const existingWorkflow = await Workflow.findById(id).lean();

    if (!existingWorkflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Handle event trigger flow instance creation/updates for first node
    let nodesToSave = nodes;
    let flowInstanceWasCreatedOrUpdated = false;

    if (nodes.length > 0) {
      const firstNode = nodes[0];
      const existingFirstNode = existingWorkflow.nodes[0];

      if (hasRequiredEventTriggerFields(firstNode)) {
        const existingConfig = existingFirstNode?.config || {};
        const existingFlowInstanceId = existingConfig.flowInstanceId as string | undefined;

        let updatedFirstNode = firstNode;

        // Create new flow instance if we don't have one or config was incomplete
        if (!existingFlowInstanceId) {
          try {
            updatedFirstNode = await createEventTriggerFlowInstance(
              firstNode,
              id,
              membraneAccessToken,
              req,
            );
            flowInstanceWasCreatedOrUpdated = true;
          } catch (error) {
            console.error(`Failed to create flow instance for node ${firstNode.id}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create flow instance';
            return NextResponse.json(
              {
                error: 'Failed to create flow instance',
                details: errorMessage,
                nodeId: firstNode.id
              },
              { status: 400 }
            );
          }
        }
        // Update existing flow instance if configuration changed
        else if (hasEventTriggerConfigChanged(existingFirstNode, firstNode)) {
          try {
            updatedFirstNode = await updateEventTriggerFlowInstance(
              existingFirstNode,
              firstNode,
              id,
              membraneAccessToken,
              req,
            );
            flowInstanceWasCreatedOrUpdated = true;
          } catch (error) {
            console.error(`Failed to update flow instance for node ${firstNode.id}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update flow instance';
            return NextResponse.json(
              {
                error: 'Failed to update flow instance',
                details: errorMessage,
                nodeId: firstNode.id
              },
              { status: 400 }
            );
          }
        }

        nodesToSave = [updatedFirstNode, ...nodes.slice(1)];
      }
    }

    // Calculate output schemas only after flow instance was created or updated
    if (flowInstanceWasCreatedOrUpdated) {
      try {
        nodesToSave = await updateNodesWithOutputSchemas(nodesToSave, membraneAccessToken);
      } catch (error) {
        console.error('Error calculating output schemas:', error);
        // Continue without output schemas if calculation fails
      }
    }

    const workflow = await Workflow.findByIdAndUpdate(id, { $set: { nodes: nodesToSave } }, { new: true }).lean();

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Failed to update workflow nodes:', error);
    return NextResponse.json({ error: 'Failed to update workflow nodes' }, { status: 500 });
  }
}
