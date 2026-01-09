'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useCustomer } from '@/components/providers/customer-provider';
import { useCurrentWorkspace } from '@/components/providers/workspace-provider';
import { getAgentHeaders } from '@/lib/agent-api';
import { Minimizer } from '@/components/ui/minimizer';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowEvent {
  _id: string;
  workflowId: string;
  userId: string;
  eventData: Record<string, unknown>;
  receivedAt: string;
  processed?: boolean;
  runId?: string;
}

interface WorkflowEventsProps {
  workflowId: string;
  refreshKey?: number;
}

export function WorkflowEvents({ workflowId, refreshKey }: WorkflowEventsProps) {
  const { customerId, customerName } = useCustomer();
  const { workspace } = useCurrentWorkspace();
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

  const loadEvents = useCallback(async () => {
    if (!customerId || !workspace) return;

    try {
      setIsLoading(true);
      const headers = getAgentHeaders(customerId, customerName);
      const response = await fetch(`/api/workflows/${workflowId}/events`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      } else {
        console.error('Failed to fetch events');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, customerId, customerName, workspace]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents, refreshKey]);

  // Auto-refresh every 5 seconds if there are events
  useEffect(() => {
    if (events.length === 0) return;

    const interval = setInterval(() => {
      loadEvents();
    }, 5000);

    return () => clearInterval(interval);
  }, [events.length, loadEvents]);

  const isExpanded = (eventId: string) => expandedEvents.has(eventId);

  const toggleEvent = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">Loading events...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">No events yet</p>
          <p className="text-sm">Events will appear here when they are received</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {events.map((event, index) => {
          const expanded = isExpanded(event._id);
          const eventNumber = events.length - index;

          return (
            <div key={event._id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleEvent(event._id)}
                className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-semibold text-foreground mb-1 text-left">
                      Event #{eventNumber}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{formatRelativeTime(event.receivedAt)}</span>
                      {event.processed && event.runId && (
                        <>
                          <span>·</span>
                          <span className="text-green-600 dark:text-green-400">Processed</span>
                        </>
                      )}
                      {!event.processed && (
                        <span className="text-yellow-600 dark:text-yellow-400">Pending</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
              {expanded && (
                <div className="p-4 bg-muted/30 border-t">
                  <Minimizer title="Event Data" defaultOpen={true}>
                    <div className="p-3 bg-background rounded-md border max-h-96 overflow-y-auto">
                      <pre className="text-xs text-foreground">
                        {JSON.stringify(event.eventData, null, 2)}
                      </pre>
                    </div>
                  </Minimizer>
                  {event.runId && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Triggered run: {event.runId}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
