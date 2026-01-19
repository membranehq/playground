'use client';

import { useParams, useRouter } from 'next/navigation';
import { Suspense, useState, useRef, useMemo } from 'react';
import * as React from 'react';
import { Plus, Play, MoreVertical, Settings, Edit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DataInput, DataSchema } from '@membranehq/react';
import { PageHeaderActions } from '@/components/page-header-context';
import { WorkflowEditor, WorkflowEditorRef } from './components/workflow-editor';
import { WorkflowProvider, useWorkflow } from './components/workflow-context';
import { useCustomer } from '@/components/providers/customer-provider';
import { useCurrentWorkspace } from '@/components/providers/workspace-provider';
import { getAgentHeaders } from '@/lib/agent-api';

function WorkflowDetailInner({ id }: { id: string }) {
  const { workflow, isLoading, activateWorkflow, deactivateWorkflow, saveWorkflowName } = useWorkflow();
  const router = useRouter();
  const { customerId, customerName } = useCustomer();
  const { workspace } = useCurrentWorkspace();
  const [isCreating, setIsCreating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [triggerInput, setTriggerInput] = useState<Record<string, unknown>>({});
  const [popoverOpen, setPopoverOpen] = useState(false);
  const workflowEditorRef = useRef<WorkflowEditorRef>(null);

  const manualTriggerNode = workflow?.nodes.find(
    (node) => node.type === 'trigger' && node.triggerType === 'manual'
  );

  const hasManualTrigger = !!manualTriggerNode;

  // Check if the manual trigger has input - must be called before early returns
  const hasInput = useMemo(() => {
    if (!manualTriggerNode) return false;
    return manualTriggerNode.config?.hasInput !== false; // Default to true for backward compatibility
  }, [manualTriggerNode]);

  // Get the input schema from the manual trigger - must be called before early returns
  const triggerInputSchema = useMemo((): DataSchema | null => {
    if (!manualTriggerNode || !hasInput) return null;
    const inputSchema = manualTriggerNode.config?.inputSchema as DataSchema | undefined;
    if (!inputSchema || !inputSchema.properties || Object.keys(inputSchema.properties).length === 0) {
      return null;
    }
    return inputSchema;
  }, [manualTriggerNode, hasInput]);

  // Update workflow name when workflow changes
  React.useEffect(() => {
    if (workflow) {
      setWorkflowName(workflow.name);
    }
  }, [workflow]);

  const onCreate = async () => {
    if (!customerId || !workspace) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: getAgentHeaders(customerId, customerName),
        body: JSON.stringify({
          name: 'Untitled Workflow',
          description: '',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/workflows/${data.id || data._id}`);
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
      setIsCreating(false);
    }
  };

  const handleEditNameClick = () => {
    if (workflow) {
      setWorkflowName(workflow.name);
      setEditNameDialogOpen(true);
    }
  };

  const handleSaveName = async () => {
    if (!workflowName.trim()) return;
    await saveWorkflowName(workflowName.trim());
    setEditNameDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Workflow not found</h2>
        </div>
      </div>
    );
  }

  const handleRunWorkflow = async (input: Record<string, unknown> = {}) => {
    if (!customerId || !workspace || !id) return;

    setPopoverOpen(false);
    setIsRunning(true);
    try {
      // Switch to runs tab first
      workflowEditorRef.current?.switchToRunsTab();

      // Call the run API
      const response = await fetch(`/api/workflows/${id}/run`, {
        method: 'POST',
        headers: getAgentHeaders(customerId, customerName),
        body: JSON.stringify({ input }),
      });

      if (response.ok) {
        // Refresh the runs list to show the new run
        workflowEditorRef.current?.refreshRuns();
        // Reset input after successful run
        setTriggerInput({});
      } else {
        console.error('Failed to run workflow');
      }
    } catch (error) {
      console.error('Error running workflow:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <>
      <PageHeaderActions>
        <div className="flex items-center gap-3">
          {/* Workflow options dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEditNameClick}>
                <Edit className="w-4 h-4 mr-2" />
                Edit workflow name
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm">Active</span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={workflow.status === 'active'}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          activateWorkflow();
                        } else {
                          deactivateWorkflow();
                        }
                      }}
                      className="h-5 w-9 [&>span]:h-4 [&>span]:w-4 [&>span[data-state=checked]]:translate-x-4 [&>span[data-state=unchecked]]:translate-x-0"
                    />
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* New Workflow button */}
          <Button onClick={onCreate} disabled={isCreating} size="sm" variant="ghost">
            <Plus className="w-4 h-4 mr-2" />
            {isCreating ? 'Creating...' : 'New Workflow'}
          </Button>
          {/* Run button - only show when there's a manual trigger */}
          {hasManualTrigger && (
            <>
              {hasInput && triggerInputSchema ? (
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={workflow?.status !== 'active' || isRunning}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {isRunning ? 'Running...' : 'Run'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-96"
                    align="end"
                    side="bottom"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Play className="h-4 w-4 text-green-600" />
                          <h3 className="font-semibold text-sm text-gray-900">Run Workflow</h3>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-4">
                        <div>
                          <DataInput
                            schema={triggerInputSchema}
                            value={triggerInput}
                            variablesSchema={{ type: 'object', properties: {} }}
                            onChange={setTriggerInput}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end pt-2 border-t border-gray-100">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRunWorkflow(triggerInput);
                          }}
                          disabled={isRunning || workflow?.status !== 'active'}
                          className="text-white px-4 rounded-full"
                        >
                          <div className="flex items-center gap-2">
                            {isRunning ? (
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                            Run Workflow
                          </div>
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Button
                  onClick={() => handleRunWorkflow()}
                  size="sm"
                  variant="ghost"
                  disabled={workflow?.status !== 'active' || isRunning}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isRunning ? 'Running...' : 'Run'}
                </Button>
              )}
            </>
          )}
        </div>
      </PageHeaderActions>

      {/* Edit workflow name dialog */}
      <Dialog open={editNameDialogOpen} onOpenChange={setEditNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit workflow name</DialogTitle>
            <DialogDescription>Enter a new name for this workflow.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workflow-name">Name</Label>
              <Input
                id="workflow-name"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveName();
                  } else if (e.key === 'Escape') {
                    setEditNameDialogOpen(false);
                  }
                }}
                placeholder="Workflow name"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveName} disabled={!workflowName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WorkflowEditor ref={workflowEditorRef} workflowId={id} />
    </>
  );
}

export default function WorkflowDetailPage() {
  const { id } = useParams();

  const resolvedId = Array.isArray(id) ? id[0] : (id as string);

  if (!resolvedId) return null;
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-full">
          <div className="border-b border-gray-200 dark:border-gray-800 py-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-48" />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      }
    >
      <WorkflowProvider id={resolvedId}>
        <WorkflowDetailInner id={resolvedId} />
      </WorkflowProvider>
    </Suspense>
  );
}
