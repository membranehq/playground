'use client';

import { ToolExecution } from './tool-execution';
import { ConnectionRequest } from './connection-request';
import { MembraneAgentSession } from './membrane-agent-session';
import { Reasoning, ReasoningTrigger, ReasoningContent } from './ai-elements/reasoning';

interface MessagePartProps {
  part: any;
  onConnectionComplete?: (integrationKey: string, connectionId: string) => void;
  onShowMembraneDetails?: (sessionId: string) => void;
}

export function MessagePart({ part, onConnectionComplete, onShowMembraneDetails }: MessagePartProps) {
  // Handle different part types
  switch (part.type) {
    case 'text':
      // Text is rendered separately in ChatMessage
      return null;

    case 'step-start':
    case 'step-finish':
      // Ignore step markers
      return null;

    case 'tool':
      // Special handling for Membrane Agent sessions (create or send message)
      if (part.tool === 'membrane_createAgentSession' || part.tool === 'membrane_sendAgentSessionMessage') {
        return (
          <MembraneAgentSession
            part={part}
            onShowDetails={(sessionId) => {
              onShowMembraneDetails?.(sessionId);
            }}
          />
        );
      }

      // Hide membrane_getAgentSession calls - they spam the chat while session is running
      if (part.tool === 'membrane_getAgentSession') {
        return null;
      }

      // Special handling for connection requests
      if (part.tool === 'request-test-connection' && part.state?.input) {
        return (
          <ConnectionRequest
            integrationKey={part.state.input.integrationSelector}
            onConnect={(connectionId) => {
              onConnectionComplete?.(part.state.input.integrationSelector, connectionId);
            }}
          />
        );
      }
      // Regular tool execution
      return <ToolExecution part={part} />;

    case 'reasoning':
      return (
        <Reasoning defaultOpen={false}>
          <ReasoningTrigger />
          <ReasoningContent>{part.text || ''}</ReasoningContent>
        </Reasoning>
      );

    case 'file':
      return (
        <div className="border border-border rounded-lg p-3 bg-muted/50">
          <div className="text-sm font-medium mb-1">📎 {part.filename || 'File'}</div>
          {part.url && (
            <a
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              View file
            </a>
          )}
        </div>
      );

    case 'agent':
      return (
        <div className="border border-border rounded-lg p-3 bg-muted/50">
          <div className="text-sm font-medium">🤖 Agent: {part.name}</div>
        </div>
      );

    // Unknown part types - show debug info
    default:
      return (
        <details className="border border-border rounded-lg p-3 bg-muted/50">
          <summary className="text-xs font-medium cursor-pointer">Unknown part type: {part.type}</summary>
          <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(part, null, 2)}</pre>
        </details>
      );
  }
}
