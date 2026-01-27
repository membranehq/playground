import { ZapIcon } from 'lucide-react';
import { BaseNode } from './base-node';
import { WorkflowNode } from '../types/workflow';
import { TriggerType } from '@/lib/workflow/node-types';
import { useIntegration } from '@membranehq/react';
import Image from 'next/image';
import { useMemo } from 'react';

interface TriggerNodeProps {
  data: {
    isEmpty?: boolean;
    onClick?: () => void;
    label?: string;
    node?: WorkflowNode;
    onDelete?: (nodeId: string) => void;
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
  };
  selected?: boolean;
}

export function TriggerNode({ data, selected }: TriggerNodeProps) {
  // Get integration key from node config for membrane triggers (only for event triggers, not manual)
  const isEventTrigger = data.node?.triggerType === 'event';
  const integrationKey = isEventTrigger ? (data.node?.config?.integrationKey as string | undefined) : undefined;

  // Only call useIntegration if we have a valid integration key (skip for manual triggers)
  const { integration: fetchedIntegration } = useIntegration(integrationKey || '');

  // Validate that the returned integration matches the requested key to avoid stale cache issues
  const integration = integrationKey && fetchedIntegration?.key === integrationKey ? fetchedIntegration : undefined;

  // Determine trigger type and display info - memoized to prevent unnecessary re-renders
  const triggerInfo = useMemo(() => {
    if (data.triggerTypeMetadata && data.node?.triggerType) {
      // For event triggers, show collection name and event type in title
      if (data.node.triggerType === 'event' && data.node.config?.dataCollection && data.node.config?.eventType) {
        const collectionName = data.node.config.dataCollection as string;
        const eventType = data.node.config.eventType as string;
        const collectionNameLabel = collectionName.charAt(0).toUpperCase() + collectionName.slice(1); // Capitalize first letter

        // Extract base event type from full value (e.g., 'created' from 'data-record-created-trigger')
        let baseEventType = eventType;
        const match = eventType.match(/^data-record-(created|updated|deleted)-trigger$/);
        if (match) {
          baseEventType = match[1];
        }
        const eventTypeLabel = baseEventType.charAt(0).toUpperCase() + baseEventType.slice(1); // Capitalize first letter

        return {
          title: `${collectionNameLabel}: ${eventTypeLabel}`,
          logoTitle: integration?.name || 'Integration',
          color: data.triggerTypeMetadata.color,
        };
      }

      // For other trigger types, use the trigger type metadata name
      return {
        title: data.label || data.node.name,
        logoTitle: data.triggerTypeMetadata.name,
        color: data.triggerTypeMetadata.color,
      };
    }

    // Fallback for triggers without specific type metadata
    return {
      title: data.label || 'Manual Trigger',
      logoTitle: 'Manual Trigger - Start workflow manually',
      color: 'blue',
    };
  }, [
    data.triggerTypeMetadata,
    data.node?.triggerType,
    data.node?.config?.dataCollection,
    data.node?.config?.eventType,
    data.label,
    data.node?.name,
    integration?.name,
  ]);

  // Determine which icon to show - memoized to prevent unnecessary re-renders
  const icon = useMemo(() => {
    // For membrane triggers with integration, show integration logo
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

    // For other trigger types, use the trigger type metadata icon
    if (data.triggerTypeMetadata?.icon) {
      return <data.triggerTypeMetadata.icon className="w-4 h-4 text-gray-600" />;
    }

    return null;
  }, [integrationKey, integration, data]);

  if (data.isEmpty) {
    return (
      <div className="relative w-[240px]">
        <div
          onClick={data.onClick}
          className="group border-2 border-dashed border-gray-300 rounded-lg bg-white p-2 cursor-pointer hover:border-gray-400 transition-all duration-200"
        >
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center group-hover:bg-gray-200 transition-colors duration-200">
              <ZapIcon className="w-4 h-4 text-gray-600" />
            </div>
            <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Add Trigger</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BaseNode
      selected={selected}
      title={triggerInfo.title}
      logoTitle={triggerInfo.logoTitle}
      icon={icon}
      node={data.node}
      onDelete={data.onDelete}
      showTargetHandle={false}
      position={data.position}
      selectedNodeId={data.selectedNodeId}
      viewOnly={data.viewOnly}
      nodeState={data.nodeState}
      isDisabled={data.isDisabled}
      hasResults={data.hasResults}
    />
  );
}
