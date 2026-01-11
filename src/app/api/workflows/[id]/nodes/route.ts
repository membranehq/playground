import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/workflow/database';
import { Workflow } from '@/lib/workflow/models/workflow';
import { updateNodesWithOutputSchemas } from '@/lib/workflow/output-schema-calculator';
import { IWorkflowNode } from '@/lib/workflow/models/workflow';
import { IntegrationAppClient } from '@membranehq/sdk';
import { getAuthenticationFromRequest } from '@/lib/auth';
import { generateIntegrationToken } from '@/lib/integration-token';
import { capitalize } from '@/lib/utils';
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
 * Extract base event type from full event type value
 * e.g., 'data-record-created-trigger' -> 'created'
 */
function extractBaseEventType(fullEventType: string): string {
  const match = fullEventType.match(/^data-record-(created|updated|deleted)-trigger$/);
  if (!match) {
    throw new Error(`Invalid event type: ${fullEventType}. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
  }
  return match[1];
}


/**
 * Parameters for creating a flow instance
 */
interface CreateFlowInstanceParams {
  membrane: IntegrationAppClient;
  integrationKey: string;
  workflowId: string;
  request?: NextRequest;

  /**
   * For use with data Data Record Events 
   * e.g., 'users', 'products', 'orders'
   */
  dataCollection: string;

  /**
   * The type of the trigger
   * e.g., 'data-record-created-trigger', 'data-record-updated-trigger', 'data-record-deleted-trigger', 'connector-event-trigger'
   */
  triggerType: (typeof VALID_EVENT_TYPES)[number];

  /**
   * For use with connector events
   * e.g., 'channel-left', 'call-ended'
   */
  connectorEventKey: string | undefined;
}

/**
 * Create flow instance to source event for event trigger node
 * Returns the flow instance ID
 */
async function createFlowInstance({
  membrane,
  integrationKey,
  dataCollection,
  triggerType,
  workflowId,
  request,
  connectorEventKey,
}: CreateFlowInstanceParams): Promise<string | null> {

  const isConnectorEvent = triggerType === 'connector-event-trigger';

  // Extract base event type for naming/keys (e.g., 'created' from 'data-record-created-trigger')
  // For connector events, use the connector event key as the identifier
  const baseEventType = isConnectorEvent
    ? (connectorEventKey || 'connector-event')
    : extractBaseEventType(triggerType);

  const integration = await membrane.integration(integrationKey).get();

  if (integration.id && integration.connection?.id) {
    // Build the trigger node config based on event type
    const triggerNodeConfig = isConnectorEvent
      ? { eventKey: connectorEventKey }
      : {
        dataSource: {
          collectionKey: dataCollection,
        },
      };

    const flowInstanceName = isConnectorEvent
      ? `Receive ${capitalize(connectorEventKey || 'Connector')} Event`
      : `Receive ${capitalize(dataCollection)} ${capitalize(baseEventType)} Event`;

    const instanceKey = isConnectorEvent
      ? `${workflowId}-connector-${connectorEventKey}`
      : `${workflowId}-${dataCollection}-${baseEventType}`;

    const triggerNodeKey = isConnectorEvent
      ? `connector-${connectorEventKey}`
      : `${baseEventType}-${dataCollection}`;

    const triggerNodeName = isConnectorEvent
      ? `${capitalize(connectorEventKey || 'Connector Event')}`
      : `${capitalize(baseEventType)}: ${capitalize(dataCollection)}`;

    // Build nodes object conditionally
    const nodes: Record<string, unknown> = {
      [triggerNodeKey]: {
        name: triggerNodeName,
        type: triggerType, // Use full trigger type value directly
        config: triggerNodeConfig,
        links: [isConnectorEvent ? { key: "send-update-to-my-app" } : { key: 'find-data-record-by-id' }],
      },
    };

    // Don't add this node if it's a connector event
    if (!isConnectorEvent) {
      nodes['find-data-record-by-id'] = {
        type: 'find-data-record-by-id',
        name: 'Find Data Record By Id',
        links: [{ key: 'send-update-to-my-app' }],
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - state and dependencies are custom properties for this flow instance
        state: 'READY',
        dependencies: [],
        config: {
          id: {
            $var: `$.input.${baseEventType}-${dataCollection}.record.id`,
          },
          dataSource: {
            collectionKey: dataCollection,
          },
        },
        isCustomized: true,
      };
    }

    nodes['send-update-to-my-app'] = {
      type: 'api-request-to-your-app',
      name: 'Create Data Record in my App',
      config: {
        request: {
          body: {
            data: {
              $var: isConnectorEvent ? `$.input.${triggerNodeKey}.record` : `$.input.${triggerNodeKey}.record`,
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

    const flowInstance = await membrane.flowInstances.create({
      name: flowInstanceName,
      connectionId: integration.connection?.id,
      integrationId: integration.id,
      instanceKey: instanceKey,
      nodes: nodes as any,
    });


    return flowInstance.id || null;
  }
  return null;
}

/**
 * Delete flow instance by ID
 */
async function deleteFlowInstance(membrane: IntegrationAppClient, flowInstanceId: string): Promise<void> {
  try {
    await membrane.flowInstance(flowInstanceId).delete();
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
  if (node.type === 'trigger' && node.triggerType === 'event') {
    const config = node.config || {};
    const integrationKey = config.integrationKey as string;
    const dataCollection = config.dataCollection as string;
    const eventType = config.eventType as string;
    const connectorEventKey = config.connectorEventKey as string | undefined;
    const eventSource = config.eventSource as 'connector' | 'data-record' | undefined;

    const membrane = new IntegrationAppClient({ token: membraneAccessToken });

    // Determine trigger type based on event source
    const triggerType = eventSource === 'connector'
      ? 'connector-event-trigger'
      : (eventType || 'data-record-created-trigger');

    const flowInstanceId = await createFlowInstance({
      membrane,
      integrationKey,
      dataCollection: dataCollection || '',
      triggerType: triggerType as (typeof VALID_EVENT_TYPES)[number],
      workflowId,
      request,
      connectorEventKey,
    });

    return {
      ...node,
      config: {
        ...config,
        flowInstanceId,
      },
    };
  }
  return node;
}

/**
 * Update flow instance when event trigger configuration changes
 * Returns the updated node with flowInstanceId
 */
async function updateEventTriggerFlowInstance(
  oldNode: IWorkflowNode,
  newNode: IWorkflowNode,
  workflowId: string,
  membraneAccessToken: string,
  request?: NextRequest,
): Promise<IWorkflowNode> {
  if (newNode.type === 'trigger' && newNode.triggerType === 'event') {
    const oldConfig = oldNode.config || {};
    const newConfig = newNode.config || {};

    const oldIntegrationKey = oldConfig.integrationKey as string;
    const oldDataCollection = oldConfig.dataCollection as string;
    const oldEventType = oldConfig.eventType as string;
    const flowInstanceId = oldConfig.flowInstanceId as string | undefined;

    const newIntegrationKey = newConfig.integrationKey as string;
    const newDataCollection = newConfig.dataCollection as string;
    const newEventType = newConfig.eventType as string;

    const membrane = new IntegrationAppClient({ token: membraneAccessToken });

    // Ensure we have a flowInstanceId for update operations
    if (!flowInstanceId) {
      throw new Error('Flow instance ID not found in node config. Cannot update flow instance.');
    }

    // If integrationKey changed, delete old instance and create new one
    if (oldIntegrationKey !== newIntegrationKey) {
      // Delete old flow instance
      await deleteFlowInstance(membrane, flowInstanceId);

      // Determine trigger type
      const triggerType = newEventType || 'data-record-created-trigger';

      // Create new flow instance
      const newFlowInstanceId = await createFlowInstance({
        membrane,
        integrationKey: newIntegrationKey,
        dataCollection: newDataCollection || '',
        triggerType: triggerType as (typeof VALID_EVENT_TYPES)[number],
        workflowId,
        request,
        connectorEventKey: undefined,
      });

      return {
        ...newNode,
        config: {
          ...newConfig,
          flowInstanceId: newFlowInstanceId,
        },
      };
    }

    // If only dataCollection or eventType changed, patch the existing instance
    if (oldDataCollection !== newDataCollection || oldEventType !== newEventType) {
      // Extract base event type for naming/keys
      const baseEventType = extractBaseEventType(newEventType);

      await membrane.flowInstance(flowInstanceId).patch({
        name: `Receive ${capitalize(newDataCollection)} ${capitalize(baseEventType)} Event`,
        nodes: {
          [`${baseEventType}-${newDataCollection}`]: {
            name: `${capitalize(baseEventType)}: ${capitalize(newDataCollection)}`,
            type: newEventType, // Use full event type value directly
            config: {
              dataSource: {
                collectionKey: newDataCollection,
              },
            },
          },
        },
      });
    }

    // Return node with existing flowInstanceId
    return {
      ...newNode,
      config: {
        ...newConfig,
        flowInstanceId,
      },
    };
  }
  return newNode;
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

    // Calculate output schemas for the nodes
    let updatedNodes = nodes;
    try {
      updatedNodes = await updateNodesWithOutputSchemas(nodes, membraneAccessToken);
    } catch (error) {
      console.error('Error calculating output schemas:', error);
      // Continue without output schemas if calculation fails
    }

    // Check if first node is an event trigger and handle flow instance creation/updates
    let nodesToSave = updatedNodes;
    if (updatedNodes.length > 0) {
      const firstNode = updatedNodes[0];
      const existingFirstNode = existingWorkflow.nodes[0];

      if (firstNode.type === 'trigger' && firstNode.triggerType === 'event') {
        const config = firstNode.config || {};
        const existingConfig = existingFirstNode?.config || {};

        const integrationKey = config.integrationKey;
        const dataCollection = config.dataCollection;
        const eventType = config.eventType;
        const connectorEventKey = config.connectorEventKey;
        const eventSource = config.eventSource;

        const existingIntegrationKey = existingConfig.integrationKey;
        const existingDataCollection = existingConfig.dataCollection;
        const existingEventType = existingConfig.eventType;
        const existingConnectorEventKey = existingConfig.connectorEventKey;
        const existingEventSource = existingConfig.eventSource;

        // Determine if this is a connector event
        const isConnectorEvent = eventSource === 'connector' || eventType === 'connector-event-trigger';
        const wasConnectorEvent = existingEventSource === 'connector' || existingEventType === 'connector-event-trigger';

        // Check if all required fields are present based on event type
        const hasAllFields = isConnectorEvent
          ? !!(integrationKey && connectorEventKey && eventType)
          : !!(integrationKey && dataCollection && eventType);
        const hadAllFields = wasConnectorEvent
          ? !!(existingIntegrationKey && existingConnectorEventKey && existingEventType)
          : !!(existingIntegrationKey && existingDataCollection && existingEventType);

        if (hasAllFields) {
          let updatedFirstNode = firstNode;
          const existingFlowInstanceId = existingConfig.flowInstanceId as string | undefined;

          // Determine action based on field comparison and flow instance existence
          if (!hadAllFields || !existingFlowInstanceId) {
            // No existing configuration OR no flow instance ID - create new flow instance
            updatedFirstNode = await createEventTriggerFlowInstance(firstNode, id, membraneAccessToken, req).catch(
              (error) => {
                console.error(`Failed to create flow instance for node ${firstNode.id}:`, error);
                return firstNode;
              },
            );
          } else {
            // Check if configuration changed
            const integrationKeyChanged = integrationKey !== existingIntegrationKey;
            const eventSourceTypeChanged = isConnectorEvent !== wasConnectorEvent;
            const eventConfigChanged = isConnectorEvent
              ? connectorEventKey !== existingConnectorEventKey || eventType !== existingEventType
              : dataCollection !== existingDataCollection || eventType !== existingEventType;

            const configurationChanged = integrationKeyChanged || eventSourceTypeChanged || eventConfigChanged;

            if (configurationChanged) {
              // Configuration changed - update flow instance
              updatedFirstNode = await updateEventTriggerFlowInstance(
                existingFirstNode,
                firstNode,
                id,
                membraneAccessToken,
                req,
              ).catch((error) => {
                console.error(`Failed to update flow instance for node ${firstNode.id}:`, error);
                return firstNode;
              });
            }
          }

          // Create new nodes array with updated first node
          nodesToSave = [updatedFirstNode, ...updatedNodes.slice(1)];
        }
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
