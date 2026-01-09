import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/workflow/lib/mongodb';
import { Workflow } from '@/lib/workflow/models/workflow';
import { updateNodesWithOutputSchemas } from '@/lib/workflow/lib/output-schema-calculator';
import { IWorkflowNode } from '@/lib/workflow/models/workflow';
import { IntegrationAppClient } from '@membranehq/sdk';
import { getAuthenticationFromRequest } from '@/lib/auth';
import { generateIntegrationToken } from '@/lib/integration-token';
import { capitalize } from '@/lib/utils';
import {
  generateVerificationHashForWorkflowEvent,
  WORKFLOW_EVENT_VERIFICATION_HASH_HEADER,
} from '@/lib/workflow/lib/workflow-event-verification';

/**
 * Get the event ingest URL for a workflow
 * This constructs the URL that will be used by Membrane to send events to our workflow
 */
function getEventIngestUrl(workflowId: string, request?: NextRequest): string {
  return `https://${process.env.APP_HOST_NAME || process.env.VERCEL_URL}/api/workflows/${workflowId}/ingest-event`;
}

/**
 * Create flow instance to source event for event trigger node
 * Returns the flow instance ID
 */
async function createFlowInstance(
  membrane: IntegrationAppClient,
  integrationKey: string,
  dataCollection: string,
  eventType: string,
  workflowId: string,
  request?: NextRequest,
): Promise<string | null> {
  const integration = await membrane.integration(integrationKey).get();

  if (integration.id && integration.connection?.id) {
    const flowInstance = await membrane.flowInstances.create({
      name: `Receive ${capitalize(dataCollection)} ${capitalize(eventType)} Event`,
      connectionId: integration.connection?.id,
      integrationId: integration.id,
      instanceKey: `${workflowId}-${dataCollection}-${eventType}`,
      nodes: {
        [`${eventType}-${dataCollection}`]: {
          name: `${capitalize(eventType)}: ${capitalize(dataCollection)}`,
          type: `data-record-${eventType}-trigger`,
          config: {
            dataSource: {
              collectionKey: dataCollection,
            },
          },
          links: [{ key: 'find-data-record-by-id' }],
        },

        'find-data-record-by-id': {
          type: 'find-data-record-by-id',
          name: 'Find Data Record By Id',
          links: [{ key: 'send-update-to-my-app' }],
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - state and dependencies are custom properties for this flow instance
          state: 'READY',
          dependencies: [],
          config: {
            id: {
              $var: `$.input.${eventType}-${dataCollection}.record.id`,
            },
            dataSource: {
              collectionKey: dataCollection,
            },
          },
          isCustomized: true,
        },

        'send-update-to-my-app': {
          type: 'api-request-to-your-app',
          name: 'Create Data Record in my App',
          config: {
            request: {
              body: {
                data: {
                  $var: `$.input.${eventType}-${dataCollection}.record`,
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
        },
      },
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

    const membrane = new IntegrationAppClient({ token: membraneAccessToken });

    const flowInstanceId = await createFlowInstance(
      membrane,
      integrationKey,
      dataCollection,
      eventType,
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

      // Create new flow instance
      const newFlowInstanceId = await createFlowInstance(
        membrane,
        newIntegrationKey,
        newDataCollection,
        newEventType,
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

    // If only dataCollection or eventType changed, patch the existing instance
    if (oldDataCollection !== newDataCollection || oldEventType !== newEventType) {
      await membrane.flowInstance(flowInstanceId).patch({
        name: `Receive ${capitalize(newDataCollection)} ${capitalize(newEventType)} Event`,
        nodes: {
          [`${newEventType}-${newDataCollection}`]: {
            name: `${capitalize(newEventType)}: ${capitalize(newDataCollection)}`,
            type: `data-record-${newEventType}-trigger`,
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

        const existingIntegrationKey = existingConfig.integrationKey;
        const existingDataCollection = existingConfig.dataCollection;
        const existingEventType = existingConfig.eventType;

        // Check if all required fields are present
        const hasAllFields = !!(integrationKey && dataCollection && eventType);
        const hadAllFields = !!(existingIntegrationKey && existingDataCollection && existingEventType);

        if (hasAllFields) {
          let updatedFirstNode = firstNode;

          // Determine action based on field comparison
          if (!hadAllFields) {
            // No existing configuration - create new flow instance
            updatedFirstNode = await createEventTriggerFlowInstance(firstNode, id, membraneAccessToken, req).catch(
              (error) => {
                console.error(`Failed to create flow instance for node ${firstNode.id}:`, error);
                return firstNode;
              },
            );
          } else if (
            integrationKey !== existingIntegrationKey ||
            dataCollection !== existingDataCollection ||
            eventType !== existingEventType
          ) {
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
