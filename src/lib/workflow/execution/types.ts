export type NodeType = 'trigger' | 'action';
export type TriggerType = 'manual' | 'event';
export type ActionNodeType = 'http' | 'action' | 'ai' | 'gate';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Result of executing a workflow node
 */
export interface NodeExecutionResult {
  /** Unique identifier for the execution */
  id: string;

  /** Node that was executed */
  nodeId: string;

  /** Whether the execution was successful */
  success: boolean;

  /** Input data that was passed to the node */
  input?: unknown;

  /** Output data from the node execution */
  output?: unknown;

  /** Error information if execution failed */
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

/**
 * Universal activity result type for all node executions
 */
export interface ActivityResult {
  /** Unique identifier for the node that was executed */
  nodeId: string;

  /** Human-readable message describing the execution result */
  message: string;

  /** Input data that was provided to the node */
  input: Record<string, unknown>;

  /** Output data from successful execution */
  output?: Record<string, unknown>;

  /** Error information if execution failed */
  error?: {
    message: string;
    type: string;
    details?: unknown;
  };
}

/**
 * HTTP-specific activity result
 */
export interface HttpActivityResult extends ActivityResult {
  input: {
    request: {
      uri: string;
      method: string;
      headers?: Record<string, string>;
      queryParameters?: Array<{ key: string; value: string }>;
    };
  };
  output?: {
    response: {
      status: number;
      statusText: string;
      headers: Record<string, string>;
      data: unknown;
    };
  };
}

/**
 * Filter-specific activity result
 */
export interface FilterActivityResult extends ActivityResult {
  input: {
    dataPath: string;
    condition: string;
    originalCount?: number;
  };
  output?: {
    filteredData: unknown[];
    filteredCount: number;
  };
}

export type NewNativeNodeData = {
  name: string;
  type: NodeType;
  configuration: Record<string, unknown>;
};

export type NativeNodeData = NewNativeNodeData & {
  id: string;
};

// Workflow node structure matching your example
export interface WorkflowNode {
  id: string;
  name: string;
  type: NodeType;
  triggerType?: TriggerType;
  nodeType?: ActionNodeType;
  config?: {
    // Common config
    inputSchema?: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    integrationKey?: string;
    connectionId?: string;
    actionId?: string;
    actionKey?: string;
    inputMapping?: Record<string, unknown>;

    // Manual trigger config
    hasInput?: boolean;

    // Event trigger config
    dataCollection?: string;

    // AI node config
    structuredOutput?: boolean;
    mcp?: {
      url?: string;
      type?: 'sse' | 'http';
      headers?: Record<string, string>;
    };

    // Gate node config
    condition?: {
      field?: { $var: string } | string;
      operator?: 'equals' | 'not_equals';
      value?: string;
    };
  };
}

export interface WorkflowDefinition {
  _id: string;
  name: string;
  nodes: WorkflowNode[];
  createdAt: string;
  updatedAt: string;
}

export type NewHttpNodeData = NewNativeNodeData & {
  type: 'http';
  configuration: {
    uri: string;
    method: HttpMethod;
    headers: Record<string, string>;
    queryParameters?: Array<{ key: string; value: string }>;
  };
};

export type HttpNodeData = NewHttpNodeData & {
  id: string;
};

export type NewFilterNodeData = NewNativeNodeData & {
  type: 'filter';
  configuration: {
    condition: string;
    dataPath: string;
  };
};

export type FilterNodeData = NewFilterNodeData & {
  id: string;
};
