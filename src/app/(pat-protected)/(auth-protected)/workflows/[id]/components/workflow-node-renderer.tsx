'use client';

import React, { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  NodeTypes,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { WorkflowNode, NodeData } from './types/workflow';
import { TriggerNode } from './nodes/trigger-node';
import { ActionNode } from './nodes/action-node';
import { PlusNode } from './nodes/plus-node';
import { NodeTypeMetadata, TriggerType } from '@/lib/workflow/node-types';

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  plus: PlusNode,
};

interface WorkflowNodeRendererProps {
  nodes: WorkflowNode[];
  nodeTypes: Record<string, NodeTypeMetadata>;
  triggerTypes: Record<string, TriggerType>;
  selectedNodeId?: string | null;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
  onDeleteNode?: (nodeId: string) => void;
  onPlusNodeClick?: (afterId: string) => void;
  onTriggerPlaceholderClick?: () => void;
  viewOnly?: boolean;
  runResults?: Array<{
    nodeId: string;
    success: boolean;
    message: string;
    output?: unknown;
    error?: {
      message: string;
      code?: string;
      details?: unknown;
    };
  }>;
}

// Inner component that uses useReactFlow hook
function WorkflowNodeRendererInner({
  nodes,
  nodeTypes: nodeTypeDefinitions,
  triggerTypes,
  selectedNodeId,
  onNodeClick,
  onDeleteNode,
  onPlusNodeClick,
  onTriggerPlaceholderClick,
  viewOnly = false,
  runResults = [],
}: WorkflowNodeRendererProps) {
  const { fitView } = useReactFlow();

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (onDeleteNode) {
        onDeleteNode(nodeId);
      }
    },
    [onDeleteNode]
  );

  // Trigger fitView after nodes are loaded and layout is ready
  useEffect(() => {
    // Use setTimeout to ensure the DOM has been updated and dimensions are calculated
    const timeoutId = setTimeout(() => {
      // Use duration: 0 for instant positioning (no slide animation)
      fitView({ padding: 0.1, minZoom: 0.1, maxZoom: 1.5, duration: 0 });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [nodes, fitView]);

  const reactFlowNodesData = useMemo(() => {
    const flowNodes: Node[] = [];

    const safeNodes = nodes ?? [];

    // Add trigger node (first node, if exists)
    const triggerNode = safeNodes.find((node) => node.type === 'trigger');
    if (triggerNode) {
      const triggerTypeMetadata = triggerNode.triggerType ? triggerTypes[triggerNode.triggerType] : undefined;
      const nodeResult = runResults.find((r) => r.nodeId === triggerNode.id);

      flowNodes.push({
        id: triggerNode.id,
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: triggerNode.name,
          node: triggerNode,
          onDelete: viewOnly ? undefined : handleDeleteNode,
          triggerTypeMetadata,
          position: 1, // Trigger is always position 1
          selectedNodeId,
          viewOnly,
          nodeState: nodeResult
            ? {
              status: nodeResult.success ? 'success' : 'error',
              isDisabled: false,
            }
            : {
              status: 'pending',
              isDisabled: true,
            },
          hasResults: !!nodeResult,
        } as NodeData,
      });
    } else if (!viewOnly) {
      // Add empty trigger node (only in edit mode)
      flowNodes.push({
        id: 'trigger-placeholder',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          isEmpty: true,
          onClick: onTriggerPlaceholderClick || (() => { }),
          position: 1, // Empty trigger is also position 1
        },
      });
    }

    // Add action nodes
    const actionNodes = safeNodes.filter((node) => node.type === 'action');
    const nodeHeight = 56; // Height of each node
    const actionStep = 117; // nodeHeight + ~61px desired gap between actions
    const firstActionTop = 100 + actionStep; // trigger top (100) + consistent step
    actionNodes.forEach((node, index) => {
      const nodeTypeMetadata = node.nodeType ? nodeTypeDefinitions[node.nodeType] : undefined;
      const actionY = firstActionTop + index * actionStep;
      const nodeResult = runResults.find((r) => r.nodeId === node.id);

      flowNodes.push({
        id: node.id,
        type: 'action',
        position: { x: 100, y: actionY },
        data: {
          label: node.name,
          node: node,
          onDelete: viewOnly ? undefined : handleDeleteNode,
          nodeTypeMetadata,
          position: index + 2, // Actions start from position 2 (after trigger)
          selectedNodeId,
          viewOnly,
          nodeState: nodeResult
            ? {
              status: nodeResult.success ? 'success' : 'error',
              isDisabled: false,
            }
            : {
              status: 'pending',
              isDisabled: true,
            },
          hasResults: !!nodeResult,
        } as NodeData,
      });

      // Add plus node between current action and next action (only in edit mode)
      if (!viewOnly) {
        const currentActionBottom = actionY + nodeHeight;
        const nextActionTop =
          index < actionNodes.length - 1 ? firstActionTop + (index + 1) * actionStep : actionY + actionStep;
        const plusY = (currentActionBottom + nextActionTop) / 2;

        flowNodes.push({
          id: `plus-${node.id}`,
          type: 'plus',
          position: { x: 100, y: plusY },
          data: {
            parentId: node.id,
            createNewNode: onPlusNodeClick || (() => { }),
          },
        });
      }
    });

    // Add plus node between trigger and first action, or after trigger if no actions (only in edit mode)
    if (!viewOnly && triggerNode) {
      if (actionNodes.length === 0) {
        // No action nodes - place plus node below trigger with consistent spacing
        const triggerBottom = 100 + nodeHeight; // 100 (trigger top) + 56 (height)
        flowNodes.push({
          id: 'plus-trigger',
          type: 'plus',
          position: { x: 100, y: triggerBottom + (actionStep - nodeHeight) / 2 }, // consistent spacing
          data: {
            parentId: triggerNode.id,
            createNewNode: onPlusNodeClick || (() => { }),
          },
        });
      } else {
        // Has action nodes - place plus node between trigger and first action
        const triggerBottom = 100 + nodeHeight; // 100 + 56 = 156
        const plusY = (triggerBottom + firstActionTop) / 2; // midpoint between trigger bottom and first action top

        flowNodes.push({
          id: 'plus-trigger',
          type: 'plus',
          position: { x: 100, y: plusY },
          data: {
            parentId: triggerNode.id,
            createNewNode: onPlusNodeClick || (() => { }),
          },
        });
      }
    }

    return flowNodes;
  }, [
    nodes,
    handleDeleteNode,
    triggerTypes,
    nodeTypeDefinitions,
    selectedNodeId,
    viewOnly,
    runResults,
    onPlusNodeClick,
    onTriggerPlaceholderClick,
  ]);

  // Convert to edges for ReactFlow
  const reactFlowEdges = useMemo(() => {
    const flowEdges: Edge[] = [];

    const safeNodes = nodes ?? [];
    const triggerNode = safeNodes.find((node) => node.type === 'trigger');
    const actionNodes = safeNodes.filter((node) => node.type === 'action');

    if (triggerNode) {
      if (actionNodes.length > 0) {
        // Connect trigger to first action
        flowEdges.push({
          id: `trigger-${actionNodes[0].id}`,
          source: triggerNode.id,
          target: actionNodes[0].id,
          type: 'smoothstep',
        });

        // Connect action nodes in sequence
        for (let i = 0; i < actionNodes.length - 1; i++) {
          flowEdges.push({
            id: `${actionNodes[i].id}-${actionNodes[i + 1].id}`,
            source: actionNodes[i].id,
            target: actionNodes[i + 1].id,
            type: 'smoothstep',
          });
        }

        // Connect last action to its plus node (only in edit mode)
        if (!viewOnly) {
          const lastAction = actionNodes[actionNodes.length - 1];
          flowEdges.push({
            id: `${lastAction.id}-plus-${lastAction.id}`,
            source: lastAction.id,
            target: `plus-${lastAction.id}`,
            type: 'smoothstep',
          });
        }
      } else if (!viewOnly) {
        // No action nodes - connect trigger to its plus node (only in edit mode)
        flowEdges.push({
          id: `trigger-plus-trigger`,
          source: triggerNode.id,
          target: 'plus-trigger',
          type: 'smoothstep',
        });
      }
    }

    return flowEdges;
  }, [nodes, viewOnly]);

  return (
    <ReactFlow
      nodes={reactFlowNodesData}
      edges={reactFlowEdges}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      defaultEdgeOptions={{ style: { stroke: '#cbd5e1', strokeLinecap: 'round', strokeWidth: 2.1 } }}
      defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      className="bg-gray-50 animate-in fade-in duration-300"
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}

// Wrapper component with ReactFlowProvider
export function WorkflowNodeRenderer(props: WorkflowNodeRendererProps) {
  return (
    <ReactFlowProvider>
      <WorkflowNodeRendererInner {...props} />
    </ReactFlowProvider>
  );
}


