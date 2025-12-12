'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCustomer } from '@/components/providers/customer-provider';
import { useCurrentWorkspace } from '@/components/providers/workspace-provider';
import { getAgentHeaders } from '@/lib/agent-api';
import { cn } from '@/lib/utils';

interface Session {
  id: string;
  title?: string;
  time?: {
    created: number;
    updated: number;
  };
}

interface AgentSessionsSidebarProps {
  onCreateSession: () => void;
  isCreating: boolean;
}

export function AgentSessionsSidebar({ onCreateSession, isCreating }: AgentSessionsSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { customerId, customerName } = useCustomer();
  const { workspace } = useCurrentWorkspace();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Get current session ID from pathname
  const currentSessionId = pathname.startsWith('/agent/sessions/')
    ? pathname.split('/')[3]
    : null;

  // Load sessions
  const loadSessions = useCallback(async () => {
    if (!customerId || !workspace) return;

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

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Refresh sessions when pathname changes (new session created)
  useEffect(() => {
    if (currentSessionId) {
      loadSessions();
    }
  }, [currentSessionId, loadSessions]);

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
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredSessions = sessions.filter((session) => {
    if (!searchQuery) return true;
    const title = session.title || `Session ${session.id.slice(0, 8)}`;
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="w-[200px] flex flex-col h-full border-r border-border bg-card/50">
      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={onCreateSession}
          disabled={isCreating}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            {searchQuery ? 'No matching sessions' : 'No sessions yet'}
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            {filteredSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => router.push(`/agent/sessions/${session.id}`)}
                className={cn(
                  'w-full text-left px-2 py-2 rounded-md transition-colors text-sm',
                  currentSessionId === session.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50 text-foreground'
                )}
              >
                <div className="truncate font-medium">
                  {session.title || `Session ${session.id.slice(0, 8)}...`}
                </div>
                {session.time?.updated && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(session.time.updated)}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          Online
        </div>
      </div>
    </div>
  );
}
