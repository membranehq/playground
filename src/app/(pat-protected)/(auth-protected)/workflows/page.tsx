'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeaderActions } from '@/components/page-header-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { useCustomer } from '@/components/providers/customer-provider';
import { useCurrentWorkspace } from '@/components/providers/workspace-provider';
import { getAgentHeaders } from '@/lib/agent-api';

type WorkflowStatus = 'active' | 'inactive';

type Workflow = {
  _id: string;
  name: string;
  status: WorkflowStatus;
  nodes: Array<unknown>;
  createdAt: string;
  lastRunAt?: string;
};

function formatRelative(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const day = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(diffMs / day);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return date.toLocaleDateString();
}

export default function WorkflowsPage() {
  const router = useRouter();
  const { customerId, customerName } = useCustomer();
  const { workspace } = useCurrentWorkspace();
  const [isCreating, setIsCreating] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadWorkflows = useCallback(async () => {
    if (!customerId || !workspace) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/workflows', {
        headers: getAgentHeaders(customerId, customerName),
      });

      if (response.ok) {
        const data = await response.json();
        setWorkflows(data || []);
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, customerName, workspace]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

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

  const handleDeleteClick = (e: React.MouseEvent, workflow: Workflow) => {
    e.stopPropagation();
    setWorkflowToDelete(workflow);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!workflowToDelete || !customerId || !workspace) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/workflows/${workflowToDelete._id}`, {
        method: 'DELETE',
        headers: getAgentHeaders(customerId, customerName),
      });

      if (response.ok) {
        setDeleteDialogOpen(false);
        setWorkflowToDelete(null);
        loadWorkflows();
      } else {
        console.error('Failed to delete workflow');
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <PageHeaderActions>
        <Button onClick={onCreate} disabled={isCreating} size="sm" variant="ghost">
          <Plus className="w-4 h-4 mr-2" />
          {isCreating ? 'Creating...' : 'New Workflow'}
        </Button>
      </PageHeaderActions>

      <div className="px-6 py-6 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-neutral-900">Workflows</h1>
          <p className="text-sm text-neutral-500">Create, manage, and run workflows.</p>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground text-sm">Loading workflows...</div>
        ) : workflows.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-10 bg-background">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 rounded-lg border border-border flex items-center justify-center bg-muted">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-sm font-medium text-foreground">No workflows yet</div>
              <div className="text-sm text-muted-foreground max-w-md">
                Create your first workflow to start automating tasks across your apps.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {workflows.map((wf) => (
              <div
                key={wf._id}
                onClick={() => router.push(`/workflows/${wf._id}`)}
                className="w-full flex items-center justify-between gap-4 p-3 text-left border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-foreground truncate">{wf.name}</div>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className={[
                          'inline-block h-2 w-2 rounded-full',
                          wf.status === 'active' ? 'bg-green-500' : 'bg-muted-foreground/40',
                        ].join(' ')}
                      />
                      <span className="capitalize">{wf.status}</span>
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <div className="text-xs text-muted-foreground text-right">
                    <div>{wf.nodes?.length || 0} nodes</div>
                    <div>
                      {wf.lastRunAt ? `Last run ${formatRelative(wf.lastRunAt)}` : `Created ${formatRelative(wf.createdAt)}`}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDeleteClick(e, wf)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workflow</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{workflowToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setWorkflowToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


