'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCustomer } from '@/components/providers/customer-provider';
import { useCurrentWorkspace } from '@/components/providers/workspace-provider';
import { getAgentHeaders } from '@/lib/agent-api';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { AgentSessionsDropdown } from '@/components/agent-sessions-dropdown';
import { PageHeaderActions } from '@/components/page-header-context';

export default function AgentPage() {
  const router = useRouter();
  const { customerId, customerName } = useCustomer();
  const { workspace } = useCurrentWorkspace();
  const [input, setInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const createSessionAndNavigate = async (initialMessage?: string) => {
    if (isCreating || !customerId || !workspace) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: getAgentHeaders(customerId, customerName),
      });

      if (response.ok) {
        const data = await response.json();
        if (initialMessage) {
          router.push(`/agent/sessions/${data.sessionId}?message=${encodeURIComponent(initialMessage)}`);
        } else {
          router.push(`/agent/sessions/${data.sessionId}`);
        }
      }
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      createSessionAndNavigate(input);
    }
  };

  const handleExampleClick = (message: string) => {
    createSessionAndNavigate(message);
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
          onNewChat={() => createSessionAndNavigate()}
          isCreating={isCreating}
        />
      </PageHeaderActions>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto -mx-4 px-4">
        <div className="max-w-3xl mx-auto px-6 py-12">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47-2.47a2.25 2.25 0 00-1.59-.659H9.06a2.25 2.25 0 00-1.59.659L5 14.5m14 0v4.25a2.25 2.25 0 01-2.25 2.25H7.25A2.25 2.25 0 015 18.75V14.5" />
              </svg>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              Welcome to the Self-integrating AI Agent
            </h1>
            <p className="text-muted-foreground">
              I build integrations on the fly. Tell me how I can help you automate tasks across your apps and services.
            </p>
          </div>

          {/* Example Cards */}
          <div className="grid grid-cols-2 gap-3 mb-10">
            <button
              onClick={() => handleExampleClick('Create a task in Linear for fixing the login bug')}
              disabled={isCreating}
              className="p-4 text-left border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-blue-500">●</span>
                <span className="font-medium text-foreground">Create Linear Task</span>
              </div>
              <div className="text-sm text-muted-foreground">Add tasks to your project</div>
            </button>

            <button
              onClick={() => handleExampleClick('Summarize my calendar for this week')}
              disabled={isCreating}
              className="p-4 text-left border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-purple-500">■</span>
                <span className="font-medium text-foreground">Summarize Calendar</span>
              </div>
              <div className="text-sm text-muted-foreground">Get your schedule overview</div>
            </button>

            <button
              onClick={() => handleExampleClick('Find contacts in HubSpot matching "Acme Corp"')}
              disabled={isCreating}
              className="p-4 text-left border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-orange-500">■</span>
                <span className="font-medium text-foreground">Search HubSpot</span>
              </div>
              <div className="text-sm text-muted-foreground">Find contacts and companies</div>
            </button>

            <button
              onClick={() => handleExampleClick('Sync my Slack messages to Notion')}
              disabled={isCreating}
              className="p-4 text-left border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-green-500">■</span>
                <span className="text-pink-500">■</span>
                <span className="font-medium text-foreground">Sync Slack to Notion</span>
              </div>
              <div className="text-sm text-muted-foreground">Connect your apps together</div>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Input Section */}
      <div className="p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me to help with your tasks and integrations..."
              disabled={isCreating}
              className="flex-1 px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={isCreating || !input.trim()}
              size="icon"
              className="h-12 w-12 rounded-full"
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
