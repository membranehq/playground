'use client';

import { Wrench, CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react';
import { Streamdown } from 'streamdown';
import type { MembraneAgentMessage as MessageType } from '@/lib/membrane-agent-api';
import { ConnectionRequest } from './connection-request';

interface MembraneAgentMessageProps {
  message: MessageType;
  onConnectionComplete?: (integrationKey: string, connectionId: string) => void;
}

interface ToolSummary {
  name: string;
  status: string;
  title?: string;
}

interface ConnectionRequestPart {
  integrationKey: string;
}

/**
 * Simplified message renderer for Membrane Agent sidebar.
 * Shows text content, tool summaries, and connection requests.
 */
export function MembraneAgentMessage({ message, onConnectionComplete }: MembraneAgentMessageProps) {
  const isUser = message.role === 'user';

  // Extract connection request parts
  const connectionRequests: ConnectionRequestPart[] =
    message.parts
      ?.filter(
        (p: any) => p.type === 'tool' && p.tool === 'request-test-connection' && p.state?.input?.integrationSelector,
      )
      .map((p: any) => ({
        integrationKey: p.state.input.integrationSelector,
      })) || [];

  // Extract tool summaries (excluding connection requests)
  const toolSummaries: ToolSummary[] =
    message.parts
      ?.filter((p: any) => p.type === 'tool' && p.tool !== 'request-test-connection')
      .map((p: any) => ({
        name: p.tool,
        status: p.state?.status || 'pending',
        title: p.state?.title,
      })) || [];

  const hasContent = !!message.content;
  const hasTools = toolSummaries.length > 0;
  const hasConnectionRequests = connectionRequests.length > 0;

  return (
    <div className={`p-3 rounded-xl text-sm ${isUser ? 'bg-neutral-200' : 'bg-white border border-neutral-200'}`}>
      {/* Text content */}
      {message.content && <Streamdown className="streamdown text-neutral-800">{message.content}</Streamdown>}

      {/* Tool summaries */}
      {hasTools && (
        <div className={`space-y-1.5 ${hasContent ? 'mt-2' : ''}`}>
          {toolSummaries.map((tool, index) => (
            <ToolSummaryItem key={index} tool={tool} />
          ))}
        </div>
      )}

      {/* Connection requests */}
      {hasConnectionRequests && (
        <div className={`space-y-2 ${hasContent || hasTools ? 'mt-3' : ''}`}>
          {connectionRequests.map((req, index) => (
            <ConnectionRequest
              key={index}
              integrationKey={req.integrationKey}
              onConnect={(connectionId) => {
                onConnectionComplete?.(req.integrationKey, connectionId);
              }}
            />
          ))}
        </div>
      )}

      {/* If no content and no tools and no connection requests, show placeholder */}
      {!hasContent && !hasTools && !hasConnectionRequests && <p className="text-neutral-400 italic">(Empty message)</p>}
    </div>
  );
}

function ToolSummaryItem({ tool }: { tool: ToolSummary }) {
  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500">
      <Wrench className="w-3 h-3 flex-shrink-0" />
      <span className="truncate flex-1">{tool.title || formatToolName(tool.name)}</span>
      <StatusBadge status={tool.status} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return (
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle2 className="w-3 h-3" />
          <span>Done</span>
        </span>
      );
    case 'running':
      return (
        <span className="flex items-center gap-1 text-neutral-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Running</span>
        </span>
      );
    case 'error':
      return (
        <span className="flex items-center gap-1 text-red-500">
          <AlertCircle className="w-3 h-3" />
          <span>Error</span>
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 text-neutral-400">
          <Clock className="w-3 h-3" />
          <span>Pending</span>
        </span>
      );
  }
}

/**
 * Format tool name for display (e.g., "membrane_searchActions" -> "Search Actions")
 */
function formatToolName(name: string): string {
  // Remove common prefixes
  let formatted = name.replace(/^(membrane_|mcp_)/, '');

  // Convert camelCase or snake_case to Title Case
  formatted = formatted
    .replace(/([A-Z])/g, ' $1') // camelCase
    .replace(/_/g, ' ') // snake_case
    .trim();

  // Capitalize first letter of each word
  return formatted
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
