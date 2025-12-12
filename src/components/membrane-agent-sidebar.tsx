'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { MembraneAgentMessage } from './membrane-agent-message';
import { useMembraneSessionStatus } from '@/hooks/use-membrane-session-status';
import {
  fetchMembraneAgentMessages,
  type MembraneAgentMessage as MessageType,
} from '@/lib/membrane-agent-api';

interface MembraneAgentSidebarProps {
  sessionId: string;
  onClose: () => void;
}

/**
 * Sidebar component that displays Membrane Agent session messages.
 * Uses the shared session status hook and refreshes messages when status changes.
 */
export function MembraneAgentSidebar({ sessionId, onClose }: MembraneAgentSidebarProps) {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevStateRef = useRef<string | null>(null);

  // Use shared hook for session status
  const { state: sessionState, isLoading: statusLoading, error: statusError } = useMembraneSessionStatus(sessionId);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch messages when session state changes or on mount
  useEffect(() => {
    // Only fetch if state changed or first load
    if (prevStateRef.current === sessionState && messages.length > 0) {
      return;
    }
    prevStateRef.current = sessionState;

    async function loadMessages() {
      try {
        setMessagesError(null);
        const response = await fetchMembraneAgentMessages(sessionId);
        setMessages(response.messages);
      } catch (err) {
        console.error('[MembraneAgentSidebar] Error fetching messages:', err);
        setMessagesError(err instanceof Error ? err.message : 'Failed to fetch messages');
      } finally {
        setMessagesLoading(false);
      }
    }

    loadMessages();
  }, [sessionId, sessionState]);

  // Also poll messages while busy
  useEffect(() => {
    if (sessionState !== 'busy') return;

    const interval = setInterval(async () => {
      try {
        const response = await fetchMembraneAgentMessages(sessionId);
        setMessages(response.messages);
      } catch (err) {
        console.error('[MembraneAgentSidebar] Error polling messages:', err);
      }
    }, 2000); // Poll every 2 seconds while busy

    return () => clearInterval(interval);
  }, [sessionId, sessionState]);

  const isLoading = messagesLoading || statusLoading;
  const error = messagesError || statusError;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">
            Membrane Agent
          </h3>
          {/* Status badge in header */}
          {sessionState === 'busy' && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-900 text-blue-300">
              <Loader2 className="w-3 h-3 animate-spin" />
              Busy
            </span>
          )}
          {sessionState === 'idle' && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-900 text-green-300">
              <CheckCircle2 className="w-3 h-3" />
              Idle
            </span>
          )}
          {sessionState === 'error' && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-300">
              <AlertCircle className="w-3 h-3" />
              Error
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-accent transition-colors"
          title="Close sidebar"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm">Loading messages...</p>
          </div>
        ) : error && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
            <p className="text-sm text-center text-red-400">
              {error}
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MembraneAgentMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  );
}
