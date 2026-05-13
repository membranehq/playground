'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  ChevronRight,
  ExternalLink,
  GitBranch,
  Globe,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Square,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomer } from '@/components/providers/customer-provider';
import { useCurrentWorkspace } from '@/components/providers/workspace-provider';
import { getAgentHeaders } from '@/lib/agent-api';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface WorkflowNode {
  id: string;
  name: string;
  type: 'trigger' | 'action';
  nodeType?: string;
  triggerType?: string;
  ready?: boolean;
}

interface WorkflowData {
  id: string;
  name: string;
  status: string;
  nodes: WorkflowNode[];
}

interface ConnectionRequiredOutput {
  type: 'connection_required';
  integrationKey: string;
  appName: string;
  reason: string;
}

// ── Node helpers ─────────────────────────────────────────────────────────────

function NodeIcon({ node }: { node: WorkflowNode }) {
  if (node.type === 'trigger') {
    return node.triggerType === 'event' ? <Zap className="h-4 w-4" /> : <Play className="h-4 w-4" />;
  }
  switch (node.nodeType) {
    case 'http': return <Globe className="h-4 w-4" />;
    case 'ai': return <Sparkles className="h-4 w-4" />;
    case 'gate': return <GitBranch className="h-4 w-4" />;
    default: return <Zap className="h-4 w-4" />;
  }
}

function nodeColorClass(node: WorkflowNode): string {
  if (node.type === 'trigger') return 'bg-violet-500/10 text-violet-600 border-violet-200 dark:border-violet-800';
  switch (node.nodeType) {
    case 'http': return 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800';
    case 'ai': return 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800';
    case 'gate': return 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800';
    default: return 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800';
  }
}

// ── Workflow preview ─────────────────────────────────────────────────────────

function WorkflowPreview({ workflowId, refreshKey }: { workflowId: string; refreshKey: number }) {
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const { customerId, customerName } = useCustomer();

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    fetch(`/api/workflows/${workflowId}`, { headers: getAgentHeaders(customerId, customerName) })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setWorkflow(data?.workflow ?? data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workflowId, customerId, customerName, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const nodes = workflow?.nodes ?? [];

  return (
    <div className="flex flex-col h-full p-4 gap-3 overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium truncate">{workflow?.name ?? 'Workflow'}</p>
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
          workflow?.status === 'active'
            ? 'bg-green-500/10 text-green-600'
            : 'bg-muted text-muted-foreground',
        )}>
          {workflow?.status ?? 'inactive'}
        </span>
      </div>

      {nodes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
          <Plus className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No nodes yet — describe your automation in the chat.</p>
        </div>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {nodes.map((node, i) => (
            <li key={node.id} className="flex flex-col gap-1">
              <div className={cn('flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm', nodeColorClass(node))}>
                <NodeIcon node={node} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{node.name}</p>
                  <p className="text-xs opacity-70 truncate">
                    {node.type === 'trigger'
                      ? node.triggerType === 'event' ? 'Event trigger' : 'Manual trigger'
                      : node.nodeType?.replace('_', ' ') ?? 'Action'}
                  </p>
                </div>
              </div>
              {i < nodes.length - 1 && (
                <div className="flex justify-center">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground rotate-90" />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ── Tool call display ────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  list_connections: 'Listing connections',
  search_actions: 'Searching actions',
  list_connection_actions: 'Listing actions',
  get_action_details: 'Getting action details',
  get_workflow: 'Reading workflow',
  set_trigger: 'Setting trigger',
  add_action_node: 'Adding node',
  update_node: 'Updating node',
  remove_node: 'Removing node',
  request_connection: 'Requesting connection',
};

function ToolBadge({ toolName, done }: { toolName: string; done: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 rounded-md px-2 py-1">
      {!done && <Loader2 className="h-3 w-3 animate-spin" />}
      {TOOL_LABELS[toolName] ?? toolName}
    </span>
  );
}

function ConnectionRequestCard({
  output,
  onConfirmed,
}: {
  output: ConnectionRequiredOutput;
  onConfirmed: (integrationKey: string) => void;
}) {
  const membraneUiUrl = process.env.NEXT_PUBLIC_INTEGRATION_APP_UI_URL ?? 'https://ui.integration.app';
  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-500/5 p-3 flex flex-col gap-2">
      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
        Connection required: {output.appName}
      </p>
      <p className="text-xs text-muted-foreground">{output.reason}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <a
          href={`${membraneUiUrl}/connections/new?integration=${output.integrationKey}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
            <ExternalLink className="h-3 w-3" />
            Connect {output.appName}
          </Button>
        </a>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-muted-foreground"
          onClick={() => onConfirmed(output.integrationKey)}
        >
          Done — I connected it
        </Button>
      </div>
    </div>
  );
}

// ── Message renderer ─────────────────────────────────────────────────────────

function MessageView({
  message,
  onConnectionConfirmed,
}: {
  message: UIMessage;
  onConnectionConfirmed: (key: string) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
      )}

      <div className={cn('max-w-[80%] flex flex-col gap-1.5', isUser ? 'items-end' : 'items-start')}>
        {message.parts.map((part, idx) => {
          if (part.type === 'text') {
            return part.text ? (
              <div
                key={idx}
                className={cn(
                  'rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                  isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
              >
                {part.text}
              </div>
            ) : null;
          }

          if (part.type === 'dynamic-tool') {
            const isDone =
              part.state === 'output-available' ||
              part.state === 'output-error' ||
              part.state === 'output-denied';

            if (
              part.toolName === 'request_connection' &&
              part.state === 'output-available' &&
              part.output
            ) {
              const output = part.output as ConnectionRequiredOutput;
              if (output?.type === 'connection_required') {
                return (
                  <ConnectionRequestCard
                    key={idx}
                    output={output}
                    onConfirmed={onConnectionConfirmed}
                  />
                );
              }
            }

            return <ToolBadge key={idx} toolName={part.toolName} done={isDone} />;
          }

          return null;
        })}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'When a new deal is created in HubSpot, add a row to Google Sheets',
  'When a Stripe payment succeeds, send a Slack message to #revenue',
  'Every time a GitHub PR is merged, create a Jira ticket',
];

export default function WorkflowBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params?.id as string;

  const { customerId, customerName } = useCustomer();
  const { workspace } = useCurrentWorkspace();

  const [input, setInput] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const headers = customerId
    ? (getAgentHeaders(customerId, customerName) as Record<string, string>)
    : {};

  const { messages, status, sendMessage, stop } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/workflow-builder/${workflowId}/chat`,
      headers,
    }),
    onFinish: () => setRefreshKey((k) => k + 1),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;
      setInput('');
      sendMessage({ role: 'user', parts: [{ type: 'text', text: trimmed }] });
    },
    [isLoading, sendMessage],
  );

  const handleConnectionConfirmed = useCallback(
    (integrationKey: string) => {
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: `I've connected ${integrationKey}. Please continue building the workflow.` }],
      });
    },
    [sendMessage],
  );

  if (!customerId || !workspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">Please log in to use the workflow builder.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Chat panel ── */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-border">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => router.push(`/workflows/${workflowId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">AI Workflow Builder</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Describe your automation</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Tell me what you want to automate and I'll build the workflow nodes for you.
                </p>
              </div>
              <div className="flex flex-col gap-1.5 w-full max-w-sm">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="text-left text-xs px-3 py-2 rounded-md border border-border bg-muted/40 hover:bg-muted transition-colors"
                    onClick={() => submit(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <MessageView
              key={message.id}
              message={message}
              onConnectionConfirmed={handleConnectionConfirmed}
            />
          ))}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3 justify-start">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="bg-muted rounded-xl px-3.5 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 pb-4 pt-2 shrink-0">
          <div className="flex gap-2 items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              placeholder="Describe your automation…"
              disabled={isLoading}
              className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 placeholder:text-muted-foreground"
            />
            {isLoading ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={stop}
                className="shrink-0 h-10 w-10 rounded-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Square className="h-4 w-4 fill-current" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                disabled={!input.trim()}
                onClick={() => submit(input)}
                className="shrink-0 h-10 w-10 rounded-full"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Workflow preview panel ── */}
      <div className="w-72 shrink-0 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="text-sm font-medium">Workflow</span>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <WorkflowPreview workflowId={workflowId} refreshKey={refreshKey} />
        </div>

        <div className="px-4 pb-4 pt-2 shrink-0 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={() => router.push(`/workflows/${workflowId}`)}
          >
            Open in editor
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
