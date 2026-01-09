import React, { useState, useEffect } from 'react';
import { WorkflowNode } from './types/workflow';
import { NodeTypeMetadata, TriggerType } from '@/lib/workflow/lib/node-types';
import { DataSchema } from '@membranehq/react';
import { ManualTriggerConfig } from './configs/manual-trigger-config';
import { EventTriggerConfig } from './configs/event-trigger-config';
import { MembraneActionConfig } from './configs/membrane-action-config';
import { HttpRequestConfig } from './configs/http-request-config';
import { AIConfig } from './configs/ai-config';
import { useWorkflow } from './workflow-context';
import { useDebounce } from '@/hooks/use-debounce';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';

interface ConfigPanelProps {
  selectedNode: WorkflowNode | null;
  onUpdateNode: (node: Omit<WorkflowNode, 'id'>) => void;
  nodeTypes: Record<string, NodeTypeMetadata>;
  triggerTypes: Record<string, TriggerType>;
}

const DEFAULT_NODE_TYPE = 'action';

/**
 * Schema for all the variables from the previous nodes
 * Uses the stored outputSchema from each node
 */
const constructVariableSchema = (nodes: WorkflowNode[], currentNodeId?: string): DataSchema => {
  const nodesBeforeCurrent = currentNodeId
    ? nodes.slice(
      0,
      nodes.findIndex((node) => node.id === currentNodeId)
    )
    : nodes;

  if (nodesBeforeCurrent.length === 0) {
    return {
      type: 'object',
      properties: {},
    };
  }

  const nodeSchemas: { [key: string]: DataSchema } = {};

  for (const node of nodesBeforeCurrent) {
    // Use the stored outputSchema if available, otherwise fallback to empty schema
    const outputSchema = node.outputSchema || { type: 'object', properties: {} };
    nodeSchemas[node.name] = outputSchema;
  }

  return {
    type: 'object',
    properties: {
      'Previous Steps': {
        type: 'object',
        properties: nodeSchemas,
      },
    },
  };
};

export function ConfigPanel({ selectedNode, onUpdateNode, nodeTypes, triggerTypes }: ConfigPanelProps) {
  const { workflow } = useWorkflow();
  const [formData, setFormData] = useState<WorkflowNode | undefined>();
  const [variableSchema, setVariableSchema] = useState<DataSchema>({ type: 'object', properties: {} });
  const debouncedFormData = useDebounce(formData, 500);

  useEffect(() => {
    if (!workflow?.nodes || !selectedNode) return;

    try {
      const schema = constructVariableSchema(workflow.nodes, selectedNode?.id);
      setVariableSchema(schema);
    } catch (error) {
      console.error('Error constructing variable schema:', error);
      setVariableSchema({ type: 'object', properties: {} });
    }
  }, [workflow?.nodes, selectedNode]);

  // Track the last saved state to prevent unnecessary saves
  const lastSavedData = React.useRef<string>('');

  // Update formData when selectedNode changes
  useEffect(() => {
    if (selectedNode) {
      setFormData((prevFormData) => {
        // If this is a different node, replace completely
        if (!prevFormData || prevFormData.id !== selectedNode.id) {
          // Reset last saved data when switching nodes (only user-editable fields)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, ready, outputSchema, ...editableFields } = selectedNode;
          lastSavedData.current = JSON.stringify(editableFields);
          return selectedNode;
        }

        // Same node - merge backend-calculated fields without overwriting user changes
        // Backend-calculated fields: ready, outputSchema
        return {
          ...prevFormData,
          // Only update backend-calculated fields
          ready: selectedNode.ready,
          outputSchema: selectedNode.outputSchema,
        };
      });
    }
  }, [selectedNode]);

  // Auto-save when debounced formData changes
  useEffect(() => {
    if (!debouncedFormData) return;

    // Skip if the node name is empty
    if (!debouncedFormData.name.trim()) return;

    // Extract only the user-editable fields (exclude calculated fields)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ready, outputSchema, ...updateData } = debouncedFormData;

    // For triggers, ensure triggerType is preserved
    if (debouncedFormData.type === 'trigger') {
      updateData.triggerType = debouncedFormData.triggerType;
    } else {
      // For actions, ensure nodeType is set
      updateData.nodeType = debouncedFormData.nodeType || DEFAULT_NODE_TYPE;
    }

    // Only compare user-editable fields to prevent saves when only calculated fields change
    const currentDataString = JSON.stringify(updateData);
    if (currentDataString === lastSavedData.current) return;

    // Update last saved data
    lastSavedData.current = currentDataString;

    onUpdateNode(updateData);
  }, [debouncedFormData, onUpdateNode]);

  const selectedNodeType = formData?.nodeType || selectedNode?.nodeType || DEFAULT_NODE_TYPE;
  const selectedNodeTypeConfig = nodeTypes[selectedNodeType];
  const selectedTriggerTypeConfig = formData?.triggerType ? triggerTypes[formData.triggerType] : undefined;

  // Don't show the panel if workflow has no nodes
  const hasNodes = workflow?.nodes && workflow.nodes.length > 0;
  if (!hasNodes) {
    return null;
  }

  if (!selectedNode || !formData) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">No node selected</p>
          <p className="text-sm">Click on a node to configure it</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-4">
        {selectedNode.type === 'trigger' && selectedTriggerTypeConfig && formData.triggerType === 'manual' && (
          <ManualTriggerConfig
            value={formData}
            onChange={(updatedNode) => {
              setFormData((prev) => (prev ? { ...updatedNode, id: prev.id } : undefined));
            }}
          />
        )}

        {selectedNode.type === 'trigger' && selectedTriggerTypeConfig && formData.triggerType === 'event' && (
          <EventTriggerConfig
            value={formData}
            onChange={(updatedNode) => {
              setFormData((prev) => (prev ? { ...updatedNode, id: prev.id } : undefined));
            }}
            variableSchema={variableSchema}
            triggerTypeConfig={selectedTriggerTypeConfig}
          />
        )}

        {selectedNode.type === 'action' && selectedNodeType === 'action' && (
          <MembraneActionConfig
            variableSchema={variableSchema}
            value={formData}
            onChange={(configuration) => {
              setFormData((prev) => (prev ? { ...configuration, id: prev.id } : undefined));
            }}
          />
        )}

        {selectedNode.type === 'action' && selectedNodeType === 'http' && selectedNodeTypeConfig && (
          <HttpRequestConfig
            variableSchema={variableSchema}
            value={formData}
            nodeTypeConfig={selectedNodeTypeConfig}
            onChange={(configuration) => {
              setFormData((prev) => (prev ? { ...configuration, id: prev.id } : undefined));
            }}
          />
        )}

        {selectedNode.type === 'action' && selectedNodeType === 'ai' && selectedNodeTypeConfig && (
          <AIConfig
            variableSchema={variableSchema}
            value={formData}
            nodeTypeConfig={selectedNodeTypeConfig}
            onChange={(configuration) => {
              setFormData((prev) => (prev ? { ...configuration, id: prev.id } : undefined));
            }}
          />
        )}
      </div>
    </div>
  );
}


