import { Node, Edge } from '@xyflow/react';
import { DataSchema } from '@membranehq/sdk';
import { NodeTypeMetadata, TriggerType } from '@/lib/workflow/node-types';

// Core workflow types
export interface WorkflowNode {
  id: string;
  name: string;
  type: 'trigger' | 'action' | 'http';
  nodeType?: string;
  triggerType?: string; // Specific trigger type (e.g., 'manual', 'webhook', 'schedule')
  parametersSchema?: DataSchema;
  outputSchema?: DataSchema;
  config?: Record<string, unknown>;
  ready?: boolean; // Set by backend when node has all required configuration
}

export interface WorkflowState {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  nodes: WorkflowNode[];
}

// Flow node data types
export interface NodeData extends Record<string, unknown> {
  label: string;
  node: WorkflowNode;
  onDelete: (nodeId: string) => void;
  nodeTypeMetadata?: NodeTypeMetadata;
  triggerTypeMetadata?: TriggerType;
  position?: number;
  selectedNodeId?: string | null;
  viewOnly?: boolean;
  nodeState?: {
    status: 'pending' | 'success' | 'error';
    isDisabled: boolean;
  };
  isDisabled?: boolean;
  hasResults?: boolean;
}

export interface PlusNodeData extends Record<string, unknown> {
  parentId: string;
  createNewNode: (afterId: string) => void;
}

// Flow elements
export interface WorkflowEdge extends Edge {
  data: {
    createNewNode: (afterId: string) => void;
  };
}

export type FlowNode = Node<NodeData | PlusNodeData>;

// Dialog props
export interface NodeDialogProps {
  mode: 'create' | 'configure';
  node?: WorkflowNode | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (node: Omit<WorkflowNode, 'id'>) => void;
}

// Legacy types (can be removed if not used elsewhere)
export interface FlowBlock {
  data: NodeData;
  id: string;
  selected: boolean;
}

export interface PlusNodeProps {
  data: PlusNodeData;
}

export interface ConnectionEdgeProps {
  id: string;
  source: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  data: {
    createNewNode: (afterId: string) => void;
  };
}

export interface Action {
  key?: string;
  name: string;
  inputSchema?: DataSchema;
}
