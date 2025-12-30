'use client';

import { Message, MessageContent, MessageResponse } from './ai-elements/message';
import { MessagePart } from './message-part';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  parts?: Array<any>; // OpenCode parts
  onConnectionComplete?: (integrationKey: string, connectionId: string) => void;
  onShowMembraneDetails?: (sessionId: string) => void;
}

// Parts that are hidden from the chat (return null in MessagePart)
const HIDDEN_PART_TYPES = ['step-start', 'step-finish'];
const HIDDEN_TOOL_NAMES = ['membrane_getAgentSession'];

function isVisiblePart(part: any): boolean {
  if (part.type === 'text') return false; // Text is rendered separately
  if (HIDDEN_PART_TYPES.includes(part.type)) return false;
  if (part.type === 'tool' && HIDDEN_TOOL_NAMES.includes(part.tool)) return false;
  return true;
}

export function ChatMessage({ role, content, parts, onConnectionComplete, onShowMembraneDetails }: ChatMessageProps) {
  const isUser = role === 'user';

  // Filter to only visible non-text parts
  const visibleParts = parts?.filter(isVisiblePart) || [];

  // Don't render empty assistant messages (no content and no visible parts)
  if (!isUser && !content && visibleParts.length === 0) {
    return null;
  }

  return (
    <Message from={role}>
      <MessageContent>
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="space-y-3">
            {content && <MessageResponse>{content}</MessageResponse>}
            {visibleParts.length > 0 && (
              <div className="space-y-2">
                {visibleParts.map((part, index) => (
                  <MessagePart
                    key={part.id || index}
                    part={part}
                    onConnectionComplete={onConnectionComplete}
                    onShowMembraneDetails={onShowMembraneDetails}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </MessageContent>
    </Message>
  );
}
