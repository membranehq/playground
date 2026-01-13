'use client';

import React, { useCallback, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Node } from '@xyflow/react';
import { Settings, History, Activity } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

import { WorkflowNode } from './types/workflow';
import { useWorkflow } from './workflow-context';
import { NodeCreateDialog } from './dialogs/node-create-dialog';
import { TriggerCreateDialog } from './dialogs/trigger-create-dialog';
import { v4 as uuidv4 } from 'uuid';
import { ConfigPanel } from './config-panel';
import { WorkflowNodeRenderer } from './workflow-node-renderer';
import { WorkflowRuns } from './workflow-runs';
import { WorkflowEvents } from './workflow-events';
import { ResizableSplitLayout } from '@/components/ui/resizable-split-layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
  const tabParam = searchParams.get('tab') as 'runs' | 'events' | 'properties' | null;
  const runIdParam = searchParams.get('runId');

  const [activeTab, setActiveTab] = useState<'runs' | 'events' | 'properties'>(
    tabParam && ['runs', 'events', 'properties'].includes(tabParam) ? tabParam : 'properties'
  );
  const [runsRefreshKey, setRunsRefreshKey] = useState(0);
  const [eventsRefreshKey, setEventsRefreshKey] = useState(0);

  // Expose method to switch to runs tab and refresh runs
  useImperativeHandle(ref, () => ({
    switchToRunsTab: () => {
      setActiveTab('runs');
    },
    refreshRuns: () => {
      setRunsRefreshKey((prev) => prev + 1);
    },
  }));

  // Sync activeTab with URL params on mount and when params change
  useEffect(() => {
    if (tabParam && ['runs', 'events', 'properties'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Switch to properties tab when a node is selected (unless URL param says otherwise)
  useEffect(() => {
    if (selectedNodeId && !tabParam) {
      setActiveTab('properties');
    }
  }, [selectedNodeId, tabParam]);

  // Handle tab change and update URL
  const handleTabChange = useCallback((value: string) => {
    const newTab = value as 'properties' | 'runs' | 'events';
    setActiveTab(newTab);
    
    // Update URL with tab param, preserving runId if switching to runs tab
    const params = new URLSearchParams(searchParams.toString());
    if (newTab === 'runs' && runIdParam) {
      params.set('tab', 'runs');
      params.set('runId', runIdParam);
    } else if (newTab === 'runs') {
      params.set('tab', 'runs');
      params.delete('runId'); // Remove runId if no specific run to show
    } else {
      params.set('tab', newTab);
      params.delete('runId'); // Remove runId when switching away from runs
    }
    
    router.push(`/workflows/${workflowId}?${params.toString()}`, { scroll: false });
  }, [workflowId, router, searchParams, runIdParam]);

  const selectedNode = selectedNodeId
    ? ((workflow?.nodes ?? []).find((n) => n.id === selectedNodeId) ?? null)
    : null;

  const [nodeCreateDialogOpen, setNodeCreateDialogOpen] = useState(false);
  const [triggerCreateDialogOpen, setTriggerCreateDialogOpen] = useState(false);
  const [pendingAfterId, setPendingAfterId] = useState<string | undefined>(undefined);

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (!viewOnly) {
        deleteNode(nodeId);
      }
    },
    [deleteNode, viewOnly]
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
    [workflow?.nodes, setSelectedNodeId, viewOnly, onNodeClick]
  );

  const handleNodeUpdate = useCallback(
    (nodeData: Omit<WorkflowNode, 'id'>) => {
      if (!workflow || !selectedNode) return;

      // Use the latest workflow nodes when updating
      const updatedNodes = workflow.nodes.map((node) =>
        node.id === selectedNode.id ? { ...node, ...nodeData } : node
      );
      // Use optimistic update for instant feedback, but API will return calculated fields
      void saveNodes(updatedNodes, { optimistic: true }).catch((err) => {
        console.error('Failed to update node:', err);
      });
    },
    [selectedNode, workflow, saveNodes]
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
    [workflow, nodeTypeDefinitions, pendingAfterId, saveNodes, setSelectedNodeId, viewOnly]
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
    [workflow, triggerTypes, saveNodes, viewOnly]
  );

  // Handle plus node clicks for creating new nodes
  const handlePlusNodeClick = useCallback(
    (afterId: string) => {
      if (viewOnly) return;
      setPendingAfterId(afterId);
      setNodeCreateDialogOpen(true);
    },
    [viewOnly]
  );

  // Handle trigger placeholder clicks
  const handleTriggerPlaceholderClick = useCallback(() => {
    if (viewOnly) return;
    setTriggerCreateDialogOpen(true);
  }, [viewOnly]);

  return (
    <>
      <ResizableSplitLayout
        header={header}
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
            <div className="flex flex-col h-full">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full">
                <div className="border-b border-border p-4">
                  <TabsList className="w-full rounded-t-xl rounded-b-xl">
                    <TabsTrigger value="properties" disabled={!selectedNode} className="flex-1">
                      <Settings className="h-4 w-4" />
                      Properties
                    </TabsTrigger>
                    <TabsTrigger value="runs" className="flex-1">
                      <History className="h-4 w-4" />
                      Runs
                    </TabsTrigger>
                    <TabsTrigger value="events" className="flex-1">
                      <Activity className="h-4 w-4" />
                      Events
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="properties" className="flex-1 overflow-hidden m-0">
                  {selectedNode ? (
                    <ConfigPanel
                      selectedNode={selectedNode}
                      onUpdateNode={handleNodeUpdate}
                      nodeTypes={nodeTypeDefinitions}
                      triggerTypes={triggerTypes}
                    />
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      Select a node to edit its properties
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="runs" className="flex-1 overflow-hidden m-0">
                  <WorkflowRuns workflowId={workflowId} refreshKey={runsRefreshKey} expandedRunId={runIdParam || undefined} />
                </TabsContent>
                <TabsContent value="events" className="flex-1 overflow-hidden m-0">
                  <WorkflowEvents workflowId={workflowId} refreshKey={eventsRefreshKey} />
                </TabsContent>
              </Tabs>
            </div>
          ) : undefined
        }
      />

      {!viewOnly && (
        <>
          <NodeCreateDialog
            isOpen={nodeCreateDialogOpen}
            onClose={() => {
              setNodeCreateDialogOpen(false);
              setPendingAfterId(undefined);
            }}
            onCreate={handleCreateNodeFromType}
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
  }
);

WorkflowEditor.displayName = 'WorkflowEditor';

