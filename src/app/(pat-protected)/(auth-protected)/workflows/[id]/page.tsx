'use client';

import { useParams, useRouter } from 'next/navigation';
import { Suspense, useState, useRef } from 'react';
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
  const workflowEditorRef = useRef<WorkflowEditorRef>(null);

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

  // Update workflow name when workflow changes
  React.useEffect(() => {
    if (workflow) {
      setWorkflowName(workflow.name);
    }
  }, [workflow]);

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
                      className="h-5 w-9 [&>span]:h-4 [&>span]:w-4 [&>span]:translate-x-4"
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
          {/* Run button */}
          <Button
            onClick={async () => {
              if (!customerId || !workspace || !id) return;

              setIsRunning(true);
              try {
                // Switch to runs tab first
                workflowEditorRef.current?.switchToRunsTab();

                // Call the run API
                const response = await fetch(`/api/workflows/${id}/run`, {
                  method: 'POST',
                  headers: getAgentHeaders(customerId, customerName),
                  body: JSON.stringify({ input: {} }),
                });

                if (response.ok) {
                  // Refresh the runs list to show the new run
                  workflowEditorRef.current?.refreshRuns();
                } else {
                  console.error('Failed to run workflow');
                }
              } catch (error) {
                console.error('Error running workflow:', error);
              } finally {
                setIsRunning(false);
              }
            }}
            size="sm"
            variant="ghost"
            disabled={workflow?.status !== 'active' || isRunning}
          >
            <Play className="w-4 h-4 mr-2" />
            {isRunning ? 'Running...' : 'Run'}
          </Button>
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
