import { BaseNode } from './base-node';
import { WorkflowNode } from '../types/workflow';
import { NodeTypeMetadata } from '@/lib/workflow/node-types';
import { useIntegration, useAction } from '@membranehq/react';
import Image from 'next/image';

interface ActionNodeProps {
  data: {
    label: string;
    node: WorkflowNode;
    onDelete: (nodeId: string) => void;
    nodeTypeMetadata?: NodeTypeMetadata;
    position?: number;
    selectedNodeId?: string | null;
    viewOnly?: boolean;
    nodeState?: {
      status: 'pending' | 'success' | 'error';
      isDisabled: boolean;
    };
    isDisabled?: boolean;
    hasResults?: boolean;
  };
  selected?: boolean;
}

export function ActionNode({ data, selected }: ActionNodeProps) {
  // Get integration key and action ID from node config for membrane actions
  const integrationKey = data.node.config?.integrationKey as string | undefined;
  const actionId = data.node.config?.actionId as string | undefined;

  // Fetch integration and action data
  const { integration: fetchedIntegration } = useIntegration(integrationKey || '');
  const { action } = useAction(actionId || '');

  // Validate that the returned integration matches the requested key to avoid stale cache issues
  const integration = integrationKey && fetchedIntegration?.key === integrationKey ? fetchedIntegration : undefined;

  // Get node type metadata for icon and styling
  const getNodeTypeInfo = () => {
    // For membrane actions with integration, show action name as title if available
    if (integrationKey && integration) {
      return {
        title: action?.name || 'Select action',
        logoTitle: integration.name,
        color: 'blue',
      };
    }

    if (data.nodeTypeMetadata && data.node.nodeType) {
      return {
        title: data.label || data.node.name,
        logoTitle: data.nodeTypeMetadata.name,
        color: data.nodeTypeMetadata.color,
      };
    }

    // Fallback for nodes without specific type metadata (no app selected)
    return {
      title: data.label || 'App',
      logoTitle: 'App',
      color: 'blue',
    };
  };

  const nodeInfo = getNodeTypeInfo();

  // Determine which icon to show
  const getIcon = () => {
    // For membrane actions with integration, show integration logo
    if (integrationKey && integration) {
      if (integration.logoUri) {
        return (
          <Image
            width={16}
            height={16}
            src={integration.logoUri}
            alt={`${integration.name} logo`}
            className="w-4 h-4 rounded"
          />
        );
      } else {
        // Fallback to first letter of integration name
        return (
          <div className="w-4 h-4 rounded bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
            {integration.name[0]}
          </div>
        );
      }
    }

    // For other node types, use the node type metadata icon
    if (data.nodeTypeMetadata?.icon) {
      return <data.nodeTypeMetadata.icon className="w-4 h-4 text-gray-600" />;
    }

    return null;
  };

  return (
    <BaseNode
      selected={selected}
      title={nodeInfo.title}
      logoTitle={nodeInfo.logoTitle}
      icon={getIcon()}
      node={data.node}
      onDelete={data.onDelete}
      position={data.position}
      selectedNodeId={data.selectedNodeId}
      isPlaceholder={nodeInfo.title === 'Select action'}
      viewOnly={data.viewOnly}
      nodeState={data.nodeState}
      isDisabled={data.isDisabled}
      hasResults={data.hasResults}
    />
  );
}
