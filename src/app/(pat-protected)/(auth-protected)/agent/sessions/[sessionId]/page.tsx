'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCustomer } from '@/components/providers/customer-provider';
import { useCurrentWorkspace } from '@/components/providers/workspace-provider';
import { getAgentHeaders, getStreamUrl } from '@/lib/agent-api';
import { Loader } from '@/components/ai-elements/loader';
import { Button } from '@/components/ui/button';
import { Square, ArrowRight } from 'lucide-react';
import { AgentSessionsDropdown } from '@/components/agent-sessions-dropdown';
import { PageHeaderActions } from '@/components/page-header-context';
import { ChatMessage } from '@/components/chat-message';
import { ResizablePanelLayout } from '@/components/resizable-panel-layout';
import { MembraneAgentSidebar } from '@/components/membrane-agent-sidebar';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parts?: any[];
}

// Helper to extract error message from various error formats
function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (err.error && typeof err.error === 'object') {
      const nestedErr = err.error as Record<string, unknown>;
      if (nestedErr.data && typeof nestedErr.data === 'object') {
        const data = nestedErr.data as Record<string, unknown>;
        if (typeof data.message === 'string') return data.message;
      }
      if (typeof nestedErr.message === 'string') return nestedErr.message;
    }
    if (typeof err.message === 'string') return err.message;
    if (typeof err.error === 'string') return err.error;
  }
  return 'An unknown error occurred';
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = params?.sessionId as string;
  const initialMessage = searchParams?.get('message');

  const { customerId, customerName } = useCustomer();
  const { workspace } = useCurrentWorkspace();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [membraneSessionId, setMembraneSessionId] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const initialMessageSentRef = useRef(false);
  const messagesMapRef = useRef(new Map<string, { info: any; parts: Map<string, any> }>());

  // Reset membrane sidebar when session changes
  useEffect(() => {
    setMembraneSessionId(null);
    initialMessageSentRef.current = false;
    messagesMapRef.current.clear();
    setMessages([]);
    setError(null);
  }, [sessionId]);

  // Convert messages map to array
  const updateMessagesFromMap = () => {
    const messagesList: Message[] = [];
    messagesMapRef.current.forEach((msg) => {
      const textParts = Array.from(msg.parts.values()).filter((part: any) => part.type === 'text');
      const content = textParts.map((part: any) => part.text).join('');
      const parts = Array.from(msg.parts.values());

      messagesList.push({
        id: msg.info.id,
        role: msg.info.role,
        content,
        parts,
      });
    });

    messagesList.sort((a, b) => a.id.localeCompare(b.id));
    setMessages(messagesList);
  };

  // Handle SSE events
  const handleEvent = (event: any) => {
    if (!event || !event.type) return;

    if (event.type === 'message.updated') {
      const info = event.properties.info;

      if (!messagesMapRef.current.has(info.id)) {
        messagesMapRef.current.set(info.id, {
          info,
          parts: new Map(),
        });
      } else {
        const existing = messagesMapRef.current.get(info.id)!;
        existing.info = info;
      }

      updateMessagesFromMap();
    }

    if (event.type === 'message.part.updated') {
      const { part } = event.properties;

      if (!messagesMapRef.current.has(part.messageID)) {
        messagesMapRef.current.set(part.messageID, {
          info: { id: part.messageID, role: 'assistant' },
          parts: new Map(),
        });
      }

      const message = messagesMapRef.current.get(part.messageID)!;
      message.parts.set(part.id, part);

      updateMessagesFromMap();
    }

    if (event.type === 'session.idle') {
      setIsLoading(false);
    }
  };

  // Connect to SSE stream
  useEffect(() => {
    if (!customerId || !workspace?.key || !workspace?.secret) return;

    const streamUrl = getStreamUrl(sessionId, customerId, workspace.key, workspace.secret);
    const eventSource = new EventSource(streamUrl);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.type === 'event') {
          handleEvent(data.event);
        } else if (data.type === 'idle') {
          setIsLoading(false);
        } else if (data.type === 'error') {
          setError(getErrorMessage(data.error));
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      eventSourceRef.current = null;
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [sessionId, customerId, workspace]);

  // Load historical messages
  useEffect(() => {
    const loadMessages = async () => {
      if (!customerId || !workspace) return;

      setIsLoadingSession(true);
      try {
        const response = await fetch(`/api/sessions/${sessionId}/messages`, {
          headers: getAgentHeaders(customerId, customerName),
        });

        if (response.ok) {
          const data = await response.json();

          messagesMapRef.current.clear();
          (data.messages || []).forEach((msg: any) => {
            const partsMap = new Map();
            (msg.parts || []).forEach((part: any) => {
              partsMap.set(part.id, part);
            });

            messagesMapRef.current.set(msg.id, {
              info: { id: msg.id, role: msg.role },
              parts: partsMap,
            });
          });

          updateMessagesFromMap();
        }
      } catch (err) {
        console.error('Error loading messages:', err);
      } finally {
        setIsLoadingSession(false);
      }
    };

    loadMessages();
  }, [sessionId, customerId, customerName, workspace]);

  // Send message
  const sendMessage = async (content: string) => {
    if (!content.trim() || !customerId || !workspace) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: getAgentHeaders(customerId, customerName),
        body: JSON.stringify({ message: content, sessionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setIsLoading(false);
    }
  };

  // Send initial message if provided
  useEffect(() => {
    if (initialMessage && !initialMessageSentRef.current && !isLoadingSession) {
      initialMessageSentRef.current = true;
      router.replace(`/agent/sessions/${sessionId}`, { scroll: false });
      sendMessage(initialMessage);
    }
  }, [initialMessage, isLoadingSession, sessionId, router]);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      const message = input;
      setInput('');
      await sendMessage(message);
    }
  };

  // Interrupt session
  const handleInterrupt = async () => {
    if (!customerId || !workspace) return;

    try {
      await fetch(`/api/sessions/${sessionId}/interrupt`, {
        method: 'POST',
        headers: getAgentHeaders(customerId, customerName),
      });
      setIsLoading(false);
    } catch (err) {
      console.error('Error interrupting session:', err);
    }
  };

  // Handle connection completion
  const handleConnectionComplete = async (integrationKey: string, connectionId: string) => {
    const message = `Connection to ${integrationKey} created successfully with ID: ${connectionId}. You can now proceed with testing.`;
    await sendMessage(message);
  };

  // Handle showing Membrane Agent details
  const handleShowMembraneDetails = (membraneAgentSessionId: string) => {
    setMembraneSessionId(membraneAgentSessionId);
  };

  // Create new session
  const createNewSession = async () => {
    if (!customerId || !workspace) return;
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: getAgentHeaders(customerId, customerName),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/agent/sessions/${data.sessionId}`);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  if (!customerId || !workspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please log in to use the agent.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeaderActions>
        <AgentSessionsDropdown
          onNewChat={createNewSession}
          isCreating={false}
        />
      </PageHeaderActions>

      <ResizablePanelLayout
        sidebar={membraneSessionId ? (
          <MembraneAgentSidebar
            sessionId={membraneSessionId}
            onClose={() => setMembraneSessionId(null)}
          />
        ) : null}
      >
        <div className="flex flex-col h-full">
          {/* Messages Area */}
          {isLoadingSession ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Loading session...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center">
              <p className="text-muted-foreground">
                Send a message to start the conversation
              </p>
            </div>
          ) : (
            <Conversation className="flex-1">
              <ConversationContent className="max-w-3xl mx-auto px-4 py-6">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    parts={message.parts}
                    onConnectionComplete={handleConnectionComplete}
                    onShowMembraneDetails={handleShowMembraneDetails}
                  />
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-3">
                      <Loader size={20} className="text-muted-foreground" />
                    </div>
                  </div>
                )}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
          )}

          {/* Error Display */}
          {error && (
            <div className="max-w-3xl mx-auto px-4 py-2">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">Error: {error}</p>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground disabled:opacity-50"
                />
                {isLoading ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleInterrupt}
                    className="h-12 w-12 rounded-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!input.trim()}
                    size="icon"
                    className="h-12 w-12 rounded-full"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      </ResizablePanelLayout>
    </div>
  );
}
