import { Handle, Position } from '@xyflow/react';
import { WorkflowNode } from '../types/workflow';
import { NodeOptionsMenu } from './node-options-menu';
import { Badge } from '@/components/ui/badge';
import { Check, AlertCircle } from 'lucide-react';
import { isNodeConfigured } from '../utils/node-validation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BaseNodeProps {
  selected?: boolean;
  title: string;
  logoTitle?: string;
  icon?: React.ReactNode;
  node?: WorkflowNode;
  onDelete?: (nodeId: string) => void;
  onClick?: () => void;
  showSourceHandle?: boolean;
  showTargetHandle?: boolean;
  className?: string;
  position?: number;
  selectedNodeId?: string | null;
  isPlaceholder?: boolean;
  viewOnly?: boolean;
  nodeState?: {
    status: 'pending' | 'success' | 'error';
    isDisabled: boolean;
  };
  isDisabled?: boolean;
  hasResults?: boolean;
}

export function BaseNode({
  selected,
  title,
  logoTitle,
  icon,
  node,
  onDelete,
  onClick,
  showSourceHandle = true,
  showTargetHandle = true,
  className = '',
  position,
  selectedNodeId,
  isPlaceholder = false,
  viewOnly = false,
  nodeState,
  isDisabled = false,
  hasResults = true,
}: BaseNodeProps) {
  const isSelected = selected || (node && selectedNodeId === node.id);

  // Determine node state styling - only show status colors in view-only mode
  const getNodeStateStyling = () => {
    if (!nodeState || !viewOnly) return '';

    switch (nodeState.status) {
      case 'success':
        return 'border-green-500 bg-green-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      case 'pending':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    if (!nodeState || !viewOnly) return null;

    switch (nodeState.status) {
      case 'success':
        return <div className="h-2 w-2 rounded-full bg-green-500" />;
      case 'error':
        return <div className="h-2 w-2 rounded-full bg-red-500" />;
      case 'pending':
        return <div className="h-2 w-2 rounded-full bg-yellow-500" />;
      default:
        return null;
    }
  };

  const baseClasses = `
    flex items-center px-3 py-1.5 rounded-md border w-[240px] shadow-sm
    bg-white border-gray-200
    transition-all duration-200 ease-in-out
    ${isSelected ? 'shadow-xl ring-2 ring-blue-500 border-blue-500 bg-blue-50' : ''}
    ${onClick && !isDisabled && hasResults ? 'cursor-pointer hover:shadow-md hover:border-gray-300 hover:bg-gray-50' : ''}
    ${isDisabled || (viewOnly && !hasResults) ? 'opacity-50 cursor-not-allowed' : ''}
    ${getNodeStateStyling()}
    ${className}
  `;

  return (
    <div className="relative">
      {showTargetHandle && (
        <Handle
          type="target"
          position={Position.Top}
          className="opacity-0! top-0! pointer-events-none!"
          style={{
            top: 0,
            left: '50%',
            width: '0px',
            height: '0px',
            transform: 'translateX(-1px)',
            border: 'none',
            borderRadius: 0,
            background: 'transparent',
          }}
        />
      )}
      <div className={baseClasses} onClick={isDisabled ? undefined : onClick}>
        <div className="flex flex-col gap-1.5 w-full relative">
          {/* Integration label section with indicator */}
          {logoTitle && (
            <div className="flex items-center gap-1.5">
              {/* Configuration status indicator */}
              {!viewOnly && node && (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex-shrink-0">
                        {isNodeConfigured(node) ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p className="text-xs">
                        {isNodeConfigured(node) ? 'All required fields configured' : 'Missing required fields'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <Badge variant="secondary" className="px-1.5 py-0.5 h-auto flex items-center gap-1 w-fit border">
                {icon && (
                  <div className="flex-shrink-0 w-3 h-3 [&>svg]:w-full [&>svg]:h-full [&>img]:w-full [&>img]:h-full [&>img]:object-cover">
                    {icon}
                  </div>
                )}
                <span className="text-[8px] font-bold">{logoTitle}</span>
              </Badge>
            </div>
          )}

          {/* For nodes without logoTitle, show indicator with title */}
          {!logoTitle && !viewOnly && node && (
            <div className="flex items-center gap-1.5 mb-[-6px]">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex-shrink-0">
                      {isNodeConfigured(node) ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="text-xs">
                      {isNodeConfigured(node) ? 'All required fields configured' : 'Missing required fields'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Title content */}
          <div className="flex-1 min-w-0 flex items-center justify-between">
            <Badge
              variant="outline"
              className={`text-[10px] font-medium px-2 py-1 h-auto flex items-center gap-2 ${isPlaceholder ? 'text-gray-400' : 'text-gray-900'}`}
            >
              {position && <span className="text-[10px] font-bold">{position}.</span>}
              {title}
            </Badge>
            {getStatusIcon() && <div className="flex-shrink-0 ml-2">{getStatusIcon()}</div>}
          </div>

          {/* Options menu positioned absolutely - only show if not in viewOnly mode */}
          {!viewOnly && onDelete && node && (
            <div className="absolute top-1 right-1">
              <NodeOptionsMenu onDelete={onDelete} nodeId={node.id} />
            </div>
          )}
        </div>
      </div>
      {showSourceHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="opacity-0! bottom-0! pointer-events-none!"
          style={{
            bottom: 0,
            left: '50%',
            width: '0px',
            height: '0px',
            transform: 'translateX(-1px)',
            border: 'none',
            borderRadius: 0,
            background: 'transparent',
          }}
        />
      )}
    </div>
  );
}


