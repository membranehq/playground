import { DataSchema } from '@membranehq/sdk';
import { WorkflowNode } from '@/app/(pat-protected)/(auth-protected)/workflows/[id]/components/types/workflow';
import { IntegrationAppClient } from '@membranehq/sdk';

export interface NodeOutputSchema {
  nodeId: string;
  outputSchema: DataSchema;
}

/**
 * Calculates the output schema for a single node based on its type and configuration
 */
export async function calculateNodeOutputSchema(
  node: WorkflowNode,
  membraneAccessToken: string,
): Promise<DataSchema> {
  const membrane = new IntegrationAppClient({
    token: membraneAccessToken,
    apiUri: process.env.MEMBRANE_API_URI || 'https://api.integration.app'
  });

  try {
    // For trigger nodes
    if (node.type === 'trigger') {
      if (node.triggerType === 'manual' && node.config?.inputSchema) {
        return node.config.inputSchema as DataSchema;
      }

      if (node.triggerType === 'event') {
        const config = node.config || {};
        const eventSource = config.eventSource as 'connector' | 'data-record' | undefined;
        const isConnectorEvent = eventSource === 'connector';

        // Handle connector event triggers
        if (isConnectorEvent && config.integrationKey && config.connectorEventKey) {
          const integration = await membrane.integration(config.integrationKey as string).get();

          if (!integration.connectorId) {
            throw new Error(`Integration ${config.integrationKey} does not have a connectorId`);
          }

          const connectorId = integration.connectorId;
          const eventKey = config.connectorEventKey as string;
          const apiUrl = `https://api.getmembrane.com/connectors/${connectorId}/events/${eventKey}`;

          const response = await fetch(apiUrl, {
            headers: {
              Authorization: `Bearer ${membraneAccessToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch connector event schema: ${response.status} ${response.statusText}`);
          }

          const eventData = await response.json();
          return (eventData.schema || { type: 'object', properties: {} }) as DataSchema;
        }

        // Handle data record event triggers
        if (!isConnectorEvent && config.integrationKey && config.dataCollection) {
          const collection = await membrane
            .connection(config.integrationKey as string)
            .dataCollection(config.dataCollection as string)
            .get();
          return collection.fieldsSchema as DataSchema;
        }
      }

      // For event triggers without proper configuration, return empty schema
      return {
        type: 'object',
        properties: {
          FALLBACK: {
            type: 'object',
            properties: {},
          },
        },
      };
    }

    // For http nodes
    if (node.nodeType === 'http') {
      const bodySchema = node.config?.outputSchema || { type: 'object', properties: {} };

      // Wrap the body schema in a full HTTP response structure
      return {
        type: 'object',
        properties: {
          statusCode: {
            type: 'number',
            description: 'HTTP status code',
          },
          headers: {
            type: 'object',
            description: 'HTTP response headers',
            properties: {},
          },
          body: bodySchema,
        },
      };
    }

    // For action nodes
    if (node.type === 'action') {
      if (node.nodeType === 'ai') {
        // Check if structured output is enabled (default to true for backward compatibility)
        const structuredOutput = node.config?.structuredOutput !== false;

        if (structuredOutput) {
          return node.config?.outputSchema as DataSchema;
        } else {
          // For unstructured text output, return a simple text schema
          return {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'Generated text from AI',
              },
            },
          };
        }
      }

      if (node.nodeType === 'action' && node.config?.actionId) {
        const action = await membrane.action(node.config.actionId as string).get();

        return action.outputSchema as DataSchema;
      }
      return { type: 'object', properties: {} };
    }

    // Default fallback for any other node types
    return { type: 'object', properties: {} };
  } catch (error) {
    console.error(`Error calculating output schema for node ${node.id}:`, error);
    return { type: 'object', properties: {} };
  }
}

/**
 * Calculates output schemas for all nodes in a workflow
 * This function processes nodes in order and calculates each node's output schema
 * based on its configuration and the schemas of previous nodes
 */
export async function calculateWorkflowOutputSchemas(
  nodes: WorkflowNode[],
  membraneAccessToken: string,
): Promise<NodeOutputSchema[]> {
  const nodeSchemas = new Map<string, DataSchema>();
  const results: NodeOutputSchema[] = [];

  // Process nodes in order
  for (const node of nodes) {
    const outputSchema = await calculateNodeOutputSchema(node, membraneAccessToken);

    // Store the schema for this node
    nodeSchemas.set(node.id, outputSchema);

    // Add to results
    results.push({
      nodeId: node.id,
      outputSchema,
    });
  }

  return results;
}

/**
 * Updates workflow nodes with their calculated output schemas
 */
export async function updateNodesWithOutputSchemas(
  nodes: WorkflowNode[],
  membraneAccessToken: string,
): Promise<WorkflowNode[]> {
  const outputSchemas = await calculateWorkflowOutputSchemas(nodes, membraneAccessToken);

  // Create a map for quick lookup
  const schemaMap = new Map(outputSchemas.map((s) => [s.nodeId, s.outputSchema]));

  // Update nodes with their output schemas
  return nodes.map((node) => ({
    ...node,
    outputSchema: schemaMap.get(node.id) || { type: 'object', properties: {} },
  }));
}
