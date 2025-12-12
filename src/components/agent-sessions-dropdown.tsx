'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { History, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useCustomer } from '@/components/providers/customer-provider';
import { useCurrentWorkspace } from '@/components/providers/workspace-provider';
import { getAgentHeaders } from '@/lib/agent-api';

interface Session {
  id: string;
  title?: string;
  time?: {
    created: number;
    updated: number;
  };
}

interface AgentSessionsDropdownProps {
  onNewChat: () => void;
  isCreating: boolean;
}

export function AgentSessionsDropdown({ onNewChat, isCreating }: AgentSessionsDropdownProps) {
  const router = useRouter();
  const { customerId, customerName } = useCustomer();
  const { workspace } = useCurrentWorkspace();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!customerId || !workspace) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/sessions', {
        headers: getAgentHeaders(customerId, customerName),
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, customerName, workspace]);

  // Load sessions when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen, loadSessions]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const filteredSessions = sessions.filter((session) => {
    if (!searchQuery) return true;
    const title = session.title || `Session ${session.id.slice(0, 8)}`;
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSelectSession = (sessionId: string) => {
    setIsOpen(false);
    router.push(`/agent/sessions/${sessionId}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={onNewChat} disabled={isCreating} size="sm" variant="ghost">
        <Plus className="w-4 h-4 mr-2" />
        New Chat
      </Button>

      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <History className="w-4 h-4 mr-2" />
            Previous Sessions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {/* Sessions List */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                Loading...
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                {searchQuery ? 'No matching sessions' : 'No previous sessions'}
              </div>
            ) : (
              <div className="py-1">
                {filteredSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
                  >
                    <div className="text-sm font-medium truncate">
                      {session.title || `Session ${session.id.slice(0, 8)}...`}
                    </div>
                    {session.time?.updated && (
                      <div className="text-xs text-muted-foreground">
                        {formatDate(session.time.updated)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
