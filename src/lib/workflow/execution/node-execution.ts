import axios from 'axios';
import { IntegrationAppClient } from '@membranehq/sdk';
import { WorkflowNode, NodeExecutionResult } from './types';
import { generateObject, generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { experimental_createMCPClient } from '@ai-sdk/mcp';

////////////////////
//  NODE EXECUTION
////////////////////

/**
 * Executes a trigger node
 */
export async function executeTriggerNode(
  node: WorkflowNode,
  triggerInput: Record<string, unknown> = {},
): Promise<NodeExecutionResult> {
  const triggerType = node.triggerType || 'manual';

  try {
    let output: unknown = {};

    switch (triggerType) {
      case 'manual':
        output = {
          triggerType: 'manual',
          timestamp: new Date().toISOString(),
          event: node.config?.inputMapping?.event || 'manual.trigger',
          ...triggerInput,
        };
        break;
      case 'event':
        output = {
          triggerType: 'event',
          timestamp: new Date().toISOString(),
          event: node.config?.inputMapping?.event || 'workflow.triggered',
          // Include trigger input data
          ...triggerInput,
        };
        break;
      default:
        throw new Error(`Unsupported trigger type: ${triggerType}`);
    }

    return {
      id: `${node.id}-${Date.now()}`,
      nodeId: node.id,
      success: true,
      input: { ...node.config?.inputMapping, ...triggerInput },
      output,
    };
  } catch (error) {
    return {
      id: `${node.id}-${Date.now()}`,
      nodeId: node.id,
      success: false,
      input: { ...node.config?.inputMapping, ...triggerInput },
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'TRIGGER_EXECUTION_ERROR',
        details: error,
      },
    };
  }
}

/**
 * Executes an HTTP action node
 */
export async function executeHttpActionNode(
  node: WorkflowNode,
  resolvedInputs: Record<string, unknown>,
): Promise<NodeExecutionResult> {
  try {
    const { uri, method, headers = {}, body, queryParameters } = resolvedInputs;

    if (!uri || typeof uri !== 'string') {
      throw new Error('HTTP node requires uri in inputMapping');
    }

    if (!method || typeof method !== 'string') {
      throw new Error('HTTP node requires method in inputMapping');
    }

    // Build URL with query parameters
    let finalUrl = uri;
    if (queryParameters && Array.isArray(queryParameters)) {
      const params = new URLSearchParams();
      for (const param of queryParameters) {
        if (param && typeof param === 'object' && 'key' in param && 'value' in param) {
          const key = String(param.key);
          const value = String(param.value);
          if (key && value !== undefined) {
            params.append(key, value);
          }
        }
      }
      const queryString = params.toString();
      if (queryString) {
        finalUrl = `${uri}${uri.includes('?') ? '&' : '?'}${queryString}`;
      }
    }

    try {
      const response = await axios({
        method: method.toUpperCase(),
        url: finalUrl,
        headers: {
          'Content-Type': 'application/json',
          ...(typeof headers === 'object' ? (headers as Record<string, string>) : {}),
        },
        data:
          ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && body
            ? typeof body === 'string'
              ? JSON.parse(body)
              : body
            : undefined,
        validateStatus: () => true, // Don't throw on any status code
      });

      const output = {
        statusCode: response.status,
        headers: response.headers,
        body: response.data,
      };

      return {
        id: `${node.id}-${Date.now()}`,
        nodeId: node.id,
        success: response.status >= 200 && response.status < 300,
        input: resolvedInputs,
        output,
        error: !(response.status >= 200 && response.status < 300)
          ? {
              message: `HTTP ${method} request failed with status ${response.status}`,
              code: 'HTTP_ERROR',
              details: { status: response.status, statusText: response.statusText },
            }
          : undefined,
      };
    } catch (error) {
      // Handle network errors or other axios errors
      if (axios.isAxiosError(error) && error.response) {
        const output = {
          statusCode: error.response.status,
          headers: error.response.headers,
          body: error.response.data,
        };

        return {
          id: `${node.id}-${Date.now()}`,
          nodeId: node.id,
          success: false,
          input: resolvedInputs,
          output,
          error: {
            message: `HTTP ${method} request failed with status ${error.response.status}`,
            code: 'HTTP_ERROR',
            details: { status: error.response.status, statusText: error.response.statusText },
          },
        };
      }

      // Network error or other error
      return {
        id: `${node.id}-${Date.now()}`,
        nodeId: node.id,
        success: false,
        input: resolvedInputs,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'HTTP_EXECUTION_ERROR',
          details: error,
        },
      };
    }
  } catch (error) {
    return {
      id: `${node.id}-${Date.now()}`,
      nodeId: node.id,
      success: false,
      input: resolvedInputs,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'HTTP_EXECUTION_ERROR',
        details: error,
      },
    };
  }
}

/**
 * Executes an action node by calling the integration.app API
 */
export async function executeMembraneActionNode(
  node: WorkflowNode,
  resolvedInputs: Record<string, unknown>,
  membraneToken: string,
): Promise<NodeExecutionResult> {
  try {
    const actionId = node.config?.actionId;
    const connectionId = node.config?.connectionId;

    if (!actionId) {
      throw new Error('Action node requires actionId in config');
    }

    const apiUri = process.env.MEMBRANE_API_URI || 'https://api.integration.app';

    const membraneClient = new IntegrationAppClient({
      token: membraneToken,
      apiUri,
    });

    try {
      // Pass connectionId as the second argument (options) to specify which connection to use
      // SDK signature: run(input?: RunInput, options?: { integrationKey?: string; connectionId?: string })
      const runOptions = connectionId ? { connectionId: connectionId as string } : undefined;

      // Log the request details
      console.log('[executeMembraneActionNode] Request:', {
        url: `${apiUri}/actions/${actionId}/run`,
        actionId,
        connectionId,
        runOptions,
        input: resolvedInputs,
      });

      const result = await membraneClient.action(actionId as string).run(resolvedInputs, runOptions);

      // Log the response
      console.log('[executeMembraneActionNode] Response:', result);

      return {
        id: `${node.id}-${Date.now()}`,
        nodeId: node.id,
        success: true,
        input: resolvedInputs,
        output: result,
      };
    } catch (error) {
      // Log the error response
      console.log('[executeMembraneActionNode] Error:', error);

      return {
        id: `${node.id}-${Date.now()}`,
        nodeId: node.id,
        success: false,
        input: resolvedInputs,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'ACTION_EXECUTION_ERROR',
          details: error,
        },
      };
    }
  } catch (error) {
    return {
      id: `${node.id}-${Date.now()}`,
      nodeId: node.id,
      success: false,
      input: resolvedInputs,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'ACTION_EXECUTION_ERROR',
        details: error,
      },
    };
  }
}

/**
 * Executes an AI action node using AI SDK
 */
export async function executeAIActionNode(
  node: WorkflowNode,
  resolvedInputs: Record<string, unknown>,
  previousResults: EnhancedNodeExecutionResult[],
): Promise<NodeExecutionResult> {
  let mcpClient: Awaited<ReturnType<typeof experimental_createMCPClient>> | null = null;

  try {
    const { prompt } = resolvedInputs;

    if (!prompt || typeof prompt !== 'string') {
      throw new Error('AI node requires prompt in inputMapping');
    }

    // Check if structured output is enabled (default to true for backward compatibility)
    const structuredOutput = node.config?.structuredOutput !== false;

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    // Initialize the AI model
    const model = anthropic('claude-sonnet-4-5');

    // Prepare context from previous results
    const context = previousResults.map((result) => ({
      node: result.nodeName || result.nodeId,
      output: result.output,
    }));

    // Check if MCP server is configured
    const mcpConfig = node.config?.mcp as
      | {
          url?: string;
          type?: 'sse' | 'http';
          headers?: Record<string, string>;
        }
      | undefined;

    let tools: Record<string, unknown> | undefined = undefined;

    // Initialize MCP client if configured
    if (mcpConfig?.url && mcpConfig?.type) {
      try {
        // Create MCP client based on type
        mcpClient = await experimental_createMCPClient({
          transport: {
            type: mcpConfig.type,
            url: mcpConfig.url,
            headers: mcpConfig.headers,
          },
        });

        // Get tools from MCP server
        tools = await mcpClient.tools();
        console.log('MCP tools loaded successfully');
      } catch (mcpError) {
        console.error('Failed to initialize MCP client:', mcpError);
        // Continue without MCP tools rather than failing the entire execution
      }
    }

    let output: unknown;

    if (structuredOutput) {
      // Get the output schema from node config
      const outputSchema = node.config?.outputSchema as Record<string, unknown> | undefined;

      if (!outputSchema) {
        throw new Error('AI node with structured output requires outputSchema in config');
      }

      // Convert JSON schema to Zod schema
      const zodSchema = jsonSchemaToZod(outputSchema);

      // Build the full prompt with context for structured output
      const fullPrompt = `${prompt}
        Available data from previous steps:
        ${JSON.stringify(context, null, 2)}
        Please provide the response according to the specified schema.
    `;

      // Call AI SDK with structured output
      const result = await generateObject({
        model,
        schema: zodSchema,
        prompt: fullPrompt,
        ...(tools && { tools }),
      });

      output = result.object;
    } else {
      // Build the full prompt with context for text generation
      const fullPrompt = `${prompt}
        Available data from previous steps:
        ${JSON.stringify(context, null, 2)}
    `;

      // Call AI SDK for text generation (tools are not passed for unstructured text generation)
      const result = await generateText({
        model,
        prompt: fullPrompt,
      });

      output = { text: result.text };
    }

    // Close MCP client if it was initialized
    if (mcpClient) {
      await mcpClient.close();
    }

    return {
      id: `${node.id}-${Date.now()}`,
      nodeId: node.id,
      success: true,
      input: resolvedInputs,
      output,
    };
  } catch (error) {
    // Close MCP client on error if it was initialized
    if (mcpClient) {
      try {
        await mcpClient.close();
      } catch (closeError) {
        console.error('Failed to close MCP client:', closeError);
      }
    }

    return {
      id: `${node.id}-${Date.now()}`,
      nodeId: node.id,
      success: false,
      input: resolvedInputs,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'AI_EXECUTION_ERROR',
        details: error,
      },
    };
  }
}

/**
 * Executes a gate node by evaluating a condition
 */
export async function executeGateNode(
  node: WorkflowNode,
  resolvedInputs: Record<string, unknown>,
  previousResults: EnhancedNodeExecutionResult[],
): Promise<NodeExecutionResult> {
  try {
    // Extract condition configuration
    const condition = node.config?.condition as
      | {
          field?: { $var: string } | string;
          operator?: 'equals' | 'not_equals';
          value?: string;
        }
      | undefined;

    if (!condition) {
      throw new Error('Gate node requires condition configuration');
    }

    if (!condition.field || !condition.operator || condition.value === undefined) {
      throw new Error('Gate node requires field, operator, and value in condition');
    }

    // Resolve the field value from previous results
    let fieldPath: string;
    if (typeof condition.field === 'object' && condition.field.$var) {
      fieldPath = condition.field.$var;
    } else if (typeof condition.field === 'string') {
      fieldPath = condition.field;
    } else {
      throw new Error('Invalid field configuration in gate node');
    }

    const fieldValue = resolveVariablePath(fieldPath, previousResults);
    const expectedValue = condition.value;
    const operator = condition.operator;

    // Perform comparison based on operator
    let conditionMet = false;
    switch (operator) {
      case 'equals':
        conditionMet = fieldValue === expectedValue;
        break;
      case 'not_equals':
        conditionMet = fieldValue !== expectedValue;
        break;
      default:
        throw new Error(`Unsupported gate operator: ${operator}`);
    }

    // Return result with pass/fail status
    return {
      id: `${node.id}-${Date.now()}`,
      nodeId: node.id,
      success: conditionMet,
      input: { fieldValue, expectedValue, operator },
      output: {
        conditionMet,
        fieldValue,
        expectedValue,
        operator,
      },
      error: conditionMet
        ? undefined
        : {
            message: `Gate condition not met: ${fieldValue} ${operator === 'equals' ? '!==' : '==='} ${expectedValue}`,
            code: 'GATE_CONDITION_FAILED',
          },
    };
  } catch (error) {
    return {
      id: `${node.id}-${Date.now()}`,
      nodeId: node.id,
      success: false,
      input: resolvedInputs,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'GATE_EXECUTION_ERROR',
        details: error,
      },
    };
  }
}

/**
 * Enhanced node result with name for better variable resolution
 */
export interface EnhancedNodeExecutionResult extends NodeExecutionResult {
  nodeName?: string;
}

export async function executeWorkflowNode(
  node: WorkflowNode,
  previousResults: EnhancedNodeExecutionResult[],
  membraneToken: string,
  triggerInput: Record<string, unknown> = {},
): Promise<EnhancedNodeExecutionResult> {
  const resolvedInputs =
    Object.keys(node?.config?.inputMapping || {}).length > 0
      ? resolveVariables(node?.config?.inputMapping!, previousResults)
      : {};

  let result: NodeExecutionResult;

  switch (node.type) {
    case 'trigger':
      result = await executeTriggerNode(node, triggerInput);
      break;

    case 'action':
      switch (node.nodeType) {
        case 'http':
          result = await executeHttpActionNode(node, resolvedInputs);
          break;
        case 'action':
          result = await executeMembraneActionNode(node, resolvedInputs, membraneToken);
          break;
        case 'ai':
          result = await executeAIActionNode(node, resolvedInputs, previousResults);
          break;
        case 'gate':
          result = await executeGateNode(node, resolvedInputs, previousResults);
          break;
        default:
          throw new Error(`Unsupported action node type: ${node.nodeType}`);
      }
      break;

    default:
      throw new Error(`Unsupported node type: ${node.type}`);
  }

  // Add node name for better variable resolution
  return {
    ...result,
    nodeName: node.name,
  };
}

//////////////////
//   UTILS
/////////////////

/**
 * Resolves variables from previous node outputs using inputMapping
 */
export function resolveVariables(
  inputMapping: Record<string, unknown>,
  previousResults: NodeExecutionResult[],
): Record<string, unknown> {
  const resolvedInputs: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(inputMapping)) {
    if (typeof value === 'object' && value !== null && '$var' in value) {
      // Handle variable references like { "$var": "$.Previous Steps.HTTP Request.id" }
      const variablePath = (value as { $var: string }).$var;
      resolvedInputs[key] = resolveVariablePath(variablePath, previousResults);
    } else {
      // Direct value
      resolvedInputs[key] = value;
    }
  }

  return resolvedInputs;
}

/**
 * Resolves a variable path from previous node results
 * Supports paths like "$.Previous Steps.HTTP Request.id" or "$.HTTP Request.data"
 */
function resolveVariablePath(path: string, previousResults: NodeExecutionResult[]): unknown {
  if (!path.startsWith('$.')) {
    throw new Error(`Invalid variable path: ${path}. Must start with "$."`);
  }

  const pathParts = path.substring(2).split('.'); // Remove "$." and split

  // Handle "Previous Steps" prefix
  if (pathParts[0] === 'Previous Steps') {
    pathParts.shift(); // Remove "Previous Steps"
  }

  let currentData: unknown = previousResults;

  // Find the node result by name (combining multiple parts if needed)
  let nodeName = '';
  let remainingPath: string[] = [];

  // Try to find the node by combining path parts until we find a match
  for (let i = 0; i < pathParts.length; i++) {
    const testName = pathParts.slice(0, i + 1).join(' ');
    const result = previousResults.find(
      (result) =>
        result.nodeId === testName ||
        (result as any).nodeName === testName ||
        // Also check if any result has a name that matches
        (result as any).name === testName,
    );

    if (result) {
      nodeName = testName;
      remainingPath = pathParts.slice(i + 1);
      currentData = result.output;
      break;
    }
  }

  if (!nodeName) {
    // If no node found by name, try to find by ID or use the first part as node identifier
    const result = previousResults.find((result) => result.nodeId === pathParts[0]);
    if (result) {
      currentData = result.output;
      remainingPath = pathParts.slice(1);
    } else {
      throw new Error(`Node not found: ${pathParts[0]}`);
    }
  }

  // Navigate through the remaining path in the output data
  for (const part of remainingPath) {
    if (currentData && typeof currentData === 'object') {
      currentData = (currentData as Record<string, unknown>)[part];
    } else {
      throw new Error(
        `Cannot access property ${part} on ${typeof currentData}. Current data: ${JSON.stringify(currentData)}`,
      );
    }
  }

  return currentData;
}

/**
 * Converts JSON Schema to Zod schema for AI SDK structured output
 */
function jsonSchemaToZod(schema: Record<string, unknown>): z.ZodTypeAny {
  const type = schema.type as string;

  switch (type) {
    case 'string':
      return z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'object':
      const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
      if (!properties) {
        return z.record(z.string(), z.unknown());
      }
      const zodShape: Record<string, z.ZodTypeAny> = {};
      for (const [key, propSchema] of Object.entries(properties)) {
        zodShape[key] = jsonSchemaToZod(propSchema);
      }
      return z.object(zodShape);
    case 'array':
      const items = schema.items as Record<string, unknown> | undefined;
      if (!items) {
        return z.array(z.unknown());
      }
      return z.array(jsonSchemaToZod(items));
    default:
      return z.unknown();
  }
}
