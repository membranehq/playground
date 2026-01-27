'use client';

import React, { useCallback, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Node } from '@xyflow/react';
import { useSearchParams, useRouter } from 'next/navigation';

import { WorkflowNode } from './types/workflow';
import { useWorkflow } from './workflow-context';
import { NodeCreateDialog } from './dialogs/node-create-dialog';
import { TriggerCreateDialog } from './dialogs/trigger-create-dialog';
import { v4 as uuidv4 } from 'uuid';
import { ConfigPanel } from './config-panel';
import { WorkflowNodeRenderer } from './workflow-node-renderer';
import { WorkflowRuns } from './workflow-runs';
import { ResizableSplitLayout } from '@/components/ui/resizable-split-layout';
import { ResizablePanelLayout } from '@/components/resizable-panel-layout';
import { MembraneAgentSidebar } from '@/components/membrane-agent-sidebar';
import { useCustomer } from '@/components/providers/customer-provider';
import { useCurrentWorkspace } from '@/components/providers/workspace-provider';
import { getAgentHeaders } from '@/lib/agent-api';

interface WorkflowEditorProps {
  workflowId: string;
  header?: React.ReactNode;
  viewOnly?: boolean;
  onNodeClick?: (nodeId: string) => void;
  runResults?: Array<{
    nodeId: string;
    success: boolean;
    message: string;
    output?: unknown;
    error?: {
      message: string;
      code?: string;
      details?: unknown;
    };
  }>;
}

export interface WorkflowEditorRef {
  switchToRunsTab: () => void;
  refreshRuns: () => void;
  openSession: (sessionId: string) => void;
}

export const WorkflowEditor = forwardRef<WorkflowEditorRef, WorkflowEditorProps>(
  ({ workflowId, header, viewOnly = false, onNodeClick, runResults }, ref) => {
    const {
      workflow,
      saveNodes,
      nodeTypes: nodeTypeDefinitions,
      triggerTypes,
      deleteNode,
      selectedNodeId,
      setSelectedNodeId,
    } = useWorkflow();

    const searchParams = useSearchParams();
    const router = useRouter();
    const runIdParam = searchParams.get('runId');

    const { customerId, customerName } = useCustomer();
    const { workspace } = useCurrentWorkspace();

    const [runsRefreshKey, setRunsRefreshKey] = useState(0);
    const [isRunsPanelExpanded, setIsRunsPanelExpanded] = useState(false);
    const [integrationsRefreshKey, setIntegrationsRefreshKey] = useState(0);

    // State for Membrane agent panel
    const [membraneAgentSessionId, setMembraneAgentSessionId] = useState<string | null>(null);
    const [membraneAgentInitialMessage, setMembraneAgentInitialMessage] = useState<string | null>(null);
    const [isCreatingMembraneSession, setIsCreatingMembraneSession] = useState(false);

    // Callback when Membrane agent session completes - refresh integrations/actions
    const handleSessionComplete = useCallback(() => {
      setIntegrationsRefreshKey((prev) => prev + 1);
    }, []);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      switchToRunsTab: () => {
        setIsRunsPanelExpanded(true);
      },
      refreshRuns: () => {
        setRunsRefreshKey((prev) => prev + 1);
      },
      openSession: (sessionId: string) => {
        setMembraneAgentSessionId(sessionId);
        setMembraneAgentInitialMessage(null);
      },
    }));

    const selectedNode = selectedNodeId ? ((workflow?.nodes ?? []).find((n) => n.id === selectedNodeId) ?? null) : null;

    const [nodeCreateDialogOpen, setNodeCreateDialogOpen] = useState(false);
    const [triggerCreateDialogOpen, setTriggerCreateDialogOpen] = useState(false);
    const [pendingAfterId, setPendingAfterId] = useState<string | undefined>(undefined);

    const handleDeleteNode = useCallback(
      (nodeId: string) => {
        if (!viewOnly) {
          deleteNode(nodeId);
        }
      },
      [deleteNode, viewOnly],
    );

    const handleNodeClick = useCallback(
      (event: React.MouseEvent, node: Node) => {
        if (viewOnly && onNodeClick) {
          onNodeClick(node.id);
        } else {
          const workflowNode = (workflow?.nodes ?? []).find((n) => n.id === node.id);
          if (!workflowNode) return;
          setSelectedNodeId(workflowNode.id);
        }
      },
      [workflow?.nodes, setSelectedNodeId, viewOnly, onNodeClick],
    );

    const [nodeSaveError, setNodeSaveError] = React.useState<{ message: string; details?: string } | null>(null);

    const handleNodeUpdate = useCallback(
      (nodeData: Omit<WorkflowNode, 'id'>) => {
        if (!workflow || !selectedNode) return;

        // Clear previous error
        setNodeSaveError(null);

        // Use the latest workflow nodes when updating
        const updatedNodes = workflow.nodes.map((node) =>
          node.id === selectedNode.id ? { ...node, ...nodeData } : node,
        );
        // Use optimistic update for instant feedback, but API will return calculated fields
        void saveNodes(updatedNodes, { optimistic: true }).catch((err) => {
          console.error('Failed to update node:', err);
          const error = err as Error & { details?: string };
          setNodeSaveError({
            message: error.message || 'Failed to save node configuration',
            details: error.details,
          });
        });
      },
      [selectedNode, workflow, saveNodes],
    );

    const handleCreateNodeFromType = useCallback(
      (selectedType: string, config?: Record<string, unknown>) => {
        if (!workflow || viewOnly) return;

        const baseName = (nodeTypeDefinitions[selectedType]?.name ?? selectedType) as string;
        const existingNodes = workflow.nodes ?? [];

        // Check if name already exists and find unique name
        let finalName = baseName;
        let counter = 1;
        while (existingNodes.some((node) => node.name === finalName)) {
          finalName = `${baseName} ${counter}`;
          counter++;
        }

        const newNode: WorkflowNode = {
          id: uuidv4(),
          name: finalName,
          type: 'action',
          nodeType: selectedType,
          config: config || {},
        };
        const updatedNodes = [...(workflow.nodes ?? [])];
        if (pendingAfterId) {
          const afterIndex = updatedNodes.findIndex((n) => n.id === pendingAfterId);
          if (afterIndex >= 0) updatedNodes.splice(afterIndex + 1, 0, newNode);
          else updatedNodes.push(newNode);
        } else {
          updatedNodes.push(newNode);
        }
        setPendingAfterId(undefined);
        setNodeCreateDialogOpen(false);
        setSelectedNodeId(newNode.id);
        // Optimistic update for instant feedback - API will return calculated fields
        void saveNodes(updatedNodes, { optimistic: true }).catch((err) => {
          console.error('Failed to create node:', err);
        });
      },
      [workflow, nodeTypeDefinitions, pendingAfterId, saveNodes, setSelectedNodeId, viewOnly],
    );

    const handleCreateTriggerFromType = useCallback(
      (selectedType: string) => {
        if (!workflow || viewOnly) return;
        const name = triggerTypes[selectedType]?.name ?? selectedType;
        const newTrigger: WorkflowNode = {
          id: uuidv4(),
          name,
          type: 'trigger',
          triggerType: selectedType,
        };
        const updatedNodes = [...(workflow.nodes ?? [])];
        const existingIndex = updatedNodes.findIndex((n) => n.type === 'trigger');
        if (existingIndex >= 0) updatedNodes[existingIndex] = newTrigger;
        else updatedNodes.unshift(newTrigger);
        setTriggerCreateDialogOpen(false);
        // Optimistic update for instant feedback - API will return calculated fields
        void saveNodes(updatedNodes, { optimistic: true }).catch((err) => {
          console.error('Failed to create trigger:', err);
        });
      },
      [workflow, triggerTypes, saveNodes, viewOnly],
    );

    // Handle plus node clicks for creating new nodes
    const handlePlusNodeClick = useCallback(
      (afterId: string) => {
        if (viewOnly) return;
        setPendingAfterId(afterId);
        setNodeCreateDialogOpen(true);
      },
      [viewOnly],
    );

    // Handle trigger placeholder clicks
    const handleTriggerPlaceholderClick = useCallback(() => {
      if (viewOnly) return;
      setTriggerCreateDialogOpen(true);
    }, [viewOnly]);

    // Handle opening Membrane agent panel
    const handleOpenMembraneAgent = useCallback(
      async (enrichedMessage: string) => {
        if (!customerId || !workspace || isCreatingMembraneSession) {
          return;
        }

        setIsCreatingMembraneSession(true);
        try {
          // Create a new Membrane agent session with the initial message and persist to workflow
          const sessionResponse = await fetch(`/api/workflows/${workflowId}/sessions`, {
            method: 'POST',
            headers: getAgentHeaders(customerId, customerName),
            body: JSON.stringify({ message: enrichedMessage }),
          });

          if (!sessionResponse.ok) {
            throw new Error('Failed to create Membrane agent session');
          }

          const { sessionId } = await sessionResponse.json();

          // Open the Membrane agent sidebar with the session and initial message
          setMembraneAgentInitialMessage(enrichedMessage);
          setMembraneAgentSessionId(sessionId);
        } catch (error) {
          console.error('Error creating Membrane agent session:', error);
        } finally {
          setIsCreatingMembraneSession(false);
        }
      },
      [customerId, customerName, workspace, workflowId, isCreatingMembraneSession],
    );

    return (
      <>
        <ResizablePanelLayout
          sidebar={
            membraneAgentSessionId ? (
              <MembraneAgentSidebar
                sessionId={membraneAgentSessionId}
                onClose={() => {
                  setMembraneAgentSessionId(null);
                  setMembraneAgentInitialMessage(null);
                }}
                initialMessage={membraneAgentInitialMessage || undefined}
                onSessionComplete={handleSessionComplete}
              />
            ) : null
          }
          defaultSidebarWidth={400}
          minSidebarWidth={300}
          maxSidebarWidth={600}
        >
          <ResizableSplitLayout
            header={header}
            rightWidth={membraneAgentSessionId ? 380 : 420}
            minRightWidth={280}
            maxRightWidth={600}
            leftPane={
              <WorkflowNodeRenderer
                nodes={workflow?.nodes ?? []}
                nodeTypes={nodeTypeDefinitions}
                triggerTypes={triggerTypes}
                selectedNodeId={selectedNodeId}
                onNodeClick={handleNodeClick}
                onDeleteNode={handleDeleteNode}
                onPlusNodeClick={handlePlusNodeClick}
                onTriggerPlaceholderClick={handleTriggerPlaceholderClick}
                viewOnly={viewOnly}
                runResults={runResults}
              />
            }
            rightPane={
              !viewOnly && workflow?.nodes && workflow.nodes.length > 0 ? (
                <div className="flex flex-col h-full gap-3 p-3">
                  {/* Properties Panel - Top */}
                  <div className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-lg border border-border bg-background">
                    <div className="px-4 py-3 border-b border-border bg-muted/30">
                      <h3 className="text-sm font-medium">Selected node properties</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {selectedNode ? (
                        <ConfigPanel
                          selectedNode={selectedNode}
                          onUpdateNode={handleNodeUpdate}
                          nodeTypes={nodeTypeDefinitions}
                          triggerTypes={triggerTypes}
                          saveError={nodeSaveError}
                          onOpenMembraneAgent={handleOpenMembraneAgent}
                          integrationsRefreshKey={integrationsRefreshKey}
                        />
                      ) : (
                        <div className="p-6 flex items-center justify-center h-full">
                          <div className="text-center text-muted-foreground">
                            <p className="text-sm font-medium">No node selected</p>
                            <p className="text-xs">Click on a node to configure it</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Runs Panel - Bottom */}
                  <div
                    className={`flex flex-col rounded-lg border border-border bg-background ${isRunsPanelExpanded ? 'h-[45%] min-h-[200px]' : ''}`}
                  >
                    <button
                      onClick={() => setIsRunsPanelExpanded(!isRunsPanelExpanded)}
                      className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between w-full hover:bg-muted/50 transition-colors"
                    >
                      <h3 className="text-sm font-medium">Workflow runs</h3>
                      {isRunsPanelExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {isRunsPanelExpanded && (
                      <div className="flex-1 overflow-hidden">
                        <WorkflowRuns
                          workflowId={workflowId}
                          refreshKey={runsRefreshKey}
                          expandedRunId={runIdParam || undefined}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : undefined
            }
          />
        </ResizablePanelLayout>

        {!viewOnly && (
          <>
            <NodeCreateDialog
              isOpen={nodeCreateDialogOpen}
              onClose={() => {
                setNodeCreateDialogOpen(false);
                setPendingAfterId(undefined);
              }}
              onCreate={handleCreateNodeFromType}
              onOpenMembraneAgent={handleOpenMembraneAgent}
            />

            <TriggerCreateDialog
              isOpen={triggerCreateDialogOpen}
              onClose={() => setTriggerCreateDialogOpen(false)}
              triggerTypes={triggerTypes}
              onCreate={handleCreateTriggerFromType}
            />
          </>
        )}
      </>
    );
  },
);

WorkflowEditor.displayName = 'WorkflowEditor';
