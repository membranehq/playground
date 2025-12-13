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

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevStateRef = useRef<string | null>(null);

  // Use shared hook for session status
  const { state: sessionState, isLoading: statusLoading, error: statusError } = useMembraneSessionStatus(sessionId);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
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

  // Also poll messages while busy (with longer interval to avoid rate limiting)
  useEffect(() => {
    if (sessionState !== 'busy') return;

    const interval = setInterval(async () => {
      try {
        const response = await fetchMembraneAgentMessages(sessionId);
        setMessages(response.messages);
      } catch (err) {
        // Silently handle rate limit errors - we'll retry on next interval
        if (!(err instanceof Error && err.message.includes('429'))) {
          console.error('[MembraneAgentSidebar] Error polling messages:', err);
        }
      }
    }, 5000); // Poll every 5 seconds while busy to avoid rate limiting

    return () => clearInterval(interval);
  }, [sessionId, sessionState]);

  const isLoading = messagesLoading || statusLoading;
  const error = messagesError || statusError;

  return (
    <div className="h-full flex flex-col bg-[#050505]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white">
            Membrane Agent
          </h3>
          {/* Status badge in header */}
          {sessionState === 'busy' && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
              <Loader2 className="w-3 h-3 animate-spin" />
              Working
            </span>
          )}
          {sessionState === 'idle' && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-800/50">
              <CheckCircle2 className="w-3 h-3" />
              Done
            </span>
          )}
          {sessionState === 'error' && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-800/50">
              <AlertCircle className="w-3 h-3" />
              Error
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-neutral-800/50 transition-colors"
          title="Close sidebar"
        >
          <X className="w-5 h-5 text-neutral-400" />
        </button>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {isLoading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm">Loading messages...</p>
          </div>
        ) : error && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
            <p className="text-sm text-center text-red-500">
              {error}
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500">
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MembraneAgentMessage key={msg.id} message={msg} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
