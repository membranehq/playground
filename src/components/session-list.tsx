'use client';

import { useState, useEffect } from 'react';
import { handleApiResponse } from '@/lib/api-error-handler';

interface Session {
  id: string;
  title: string;
  time: {
    created: number;
    updated: number;
  };
}

interface SessionListProps {
  onSelectSession: (sessionId: string) => void;
}

export function SessionList({ onSelectSession }: SessionListProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sessions');
      await handleApiResponse(response);
      const data = await response.json();
      setSessions(data.sessions.slice(0, 5)); // Show only last 5
    } catch (err) {
      console.error('[SessionList] Error loading sessions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground text-sm">Loading previous sessions...</div>;
  }

  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Continue Previous Sessions</h3>
      <div className="grid grid-cols-1 gap-2 max-w-2xl mx-auto">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className="p-3 text-left border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {session.title || 'Untitled Session'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{formatDate(session.time.updated)}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
