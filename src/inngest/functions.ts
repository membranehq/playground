import { inngest } from './client';
import { connectToDatabase } from '@/lib/workflow/database';
import { WorkflowRun, type IWorkflowRunDocument } from '@/lib/workflow/models/workflow-run';
import { Workflow, type IWorkflowDocument } from '@/lib/workflow/models/workflow';
import { executeWorkflowNode, EnhancedNodeExecutionResult } from '@/lib/workflow/execution/node-execution';
import type { WorkflowNode } from '@/lib/workflow/execution/types';

/**
 * Inngest function for durable workflow execution
 * Each node is executed as a durable step to ensure reliability
 */
export const executeWorkflow = inngest.createFunction(
  {
    id: 'execute-workflow',
    retries: 3, // Retry failed workflows up to 3 times
  },
  { event: 'workflow/execute' },
  async ({ event, step }) => {
    const { workflowId, runId, membraneToken, triggerInput } = event.data;

    // Step 1: Load workflow and run from database
    const loadResult = await step.run(
      'load-workflow',
      async (): Promise<{
        workflow: IWorkflowDocument;
        workflowRun: IWorkflowRunDocument;
      }> => {
        await connectToDatabase();

        const workflow = await Workflow.findById(workflowId);
        if (!workflow) {
          throw new Error(`Workflow ${workflowId} not found`);
        }

        const workflowRun = await WorkflowRun.findById(runId);
        if (!workflowRun) {
          throw new Error(`Workflow run ${runId} not found`);
        }

        return { workflow, workflowRun };
      },
    );

    type LoadResult = {
      workflow: IWorkflowDocument;
      workflowRun: IWorkflowRunDocument;
    };
    const { workflow } = loadResult as LoadResult;
    const nodes = workflow.nodes as WorkflowNode[];

    // Execute each node as its own durable step
    // Each step is completely isolated and loads state from the database
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // Each node is its own durable step - includes execution and progress update atomically
      // Use node name as the step key
      const nodeName = node.name || `unnamed-node-${i}`;
      const result = await step.run(nodeName, async () => {
        await connectToDatabase();

        // Load current state of workflow run to get previous results and accurate start time
        const currentRun = await WorkflowRun.findById(runId);
        if (!currentRun) {
          throw new Error(`Workflow run ${runId} not found`);
        }

        const startTime = currentRun.startedAt.getTime();

        // Convert stored results back to EnhancedNodeExecutionResult format
        const previousResults: EnhancedNodeExecutionResult[] = (currentRun.results || []).map((r, idx) => ({
          id: `${r.nodeId}-${idx}`,
          nodeId: r.nodeId,
          nodeName: r.nodeName,
          success: r.success,
          input: r.input,
          output: r.output,
          error: r.error,
        }));

        // Execute the current node
        let nodeResult: EnhancedNodeExecutionResult;
        try {
          nodeResult = await executeWorkflowNode(node, previousResults, membraneToken, triggerInput);
        } catch (error) {
          // Create failed result if execution throws
          nodeResult = {
            id: `${node.id}-${Date.now()}`,
            nodeId: node.id,
            nodeName: node.name,
            success: false,
            input: {},
            error: {
              message: error instanceof Error ? error.message : 'Unknown error',
              code: 'NODE_EXECUTION_ERROR',
              details: error,
            },
          } as EnhancedNodeExecutionResult;
        }

        // Add current node result to previous results
        const updatedResults = [...previousResults, nodeResult];

        // Update workflow run progress immediately after node execution
        const successfulNodes = updatedResults.filter((r) => r.success).length;
        const failedNodes = updatedResults.filter((r) => !r.success).length;
        const totalNodes = nodes.length;
        const executionTime = Date.now() - startTime;

        await WorkflowRun.findByIdAndUpdate(runId, {
          results: updatedResults.map((r) => ({
            nodeId: r.nodeId,
            nodeName: r.nodeName,
            success: r.success,
            message: r.success
              ? r.nodeName
                ? `${r.nodeName} completed successfully`
                : 'Success'
              : r.error?.message || 'Failed',
            input: r.input,
            output: r.output,
            error: r.error,
          })),
          summary: {
            totalNodes,
            successfulNodes,
            failedNodes,
            successRate: totalNodes > 0 ? (successfulNodes / totalNodes) * 100 : 0,
          },
          // Update status if this node failed
          ...(nodeResult.success
            ? {}
            : {
                status: 'failed' as const,
                completedAt: new Date(),
                executionTime,
                error: nodeResult.error?.message || 'Workflow execution failed',
              }),
        });

        return nodeResult;
      });

      // Stop execution if node failed - the step above already marked it as failed
      if (!result.success) {
        return { success: false, runId };
      }
    }

    // Mark workflow as completed - final step
    await step.run('mark-workflow-completed', async () => {
      await connectToDatabase();

      // Load final state to get accurate results and start time
      const finalRun = await WorkflowRun.findById(runId);
      if (!finalRun) {
        throw new Error(`Workflow run ${runId} not found`);
      }

      const startTime = finalRun.startedAt.getTime();
      const executionTime = Date.now() - startTime;
      const totalNodes = finalRun.results?.length || 0;
      const successfulNodes = finalRun.results?.filter((r) => r.success).length || 0;
      const failedNodes = finalRun.results?.filter((r) => !r.success).length || 0;

      await WorkflowRun.findByIdAndUpdate(runId, {
        status: 'completed',
        completedAt: new Date(),
        executionTime,
        summary: {
          totalNodes,
          successfulNodes,
          failedNodes,
          successRate: totalNodes > 0 ? (successfulNodes / totalNodes) * 100 : 0,
        },
      });
    });

    return { success: true, runId };
  },
);
