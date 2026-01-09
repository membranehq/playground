import { executeWorkflowNode, EnhancedNodeExecutionResult } from './node-execution';
import { WorkflowNode } from './types';
import { connectToDatabase } from '@/lib/workflow/database';
import { WorkflowRun } from '../models/workflow-run';

export async function executeWorkflowNodes(
  nodes: WorkflowNode[],
  membraneToken: string,
  triggerInput: Record<string, unknown> = {},
  runId: string,
): Promise<EnhancedNodeExecutionResult[]> {
  const results: EnhancedNodeExecutionResult[] = [];
  const startTime = Date.now();

  let failed = false;

  for (const node of nodes) {
    let result: EnhancedNodeExecutionResult;

    try {
      result = await executeWorkflowNode(node, results, membraneToken, triggerInput);
    } catch (error) {
      // If executeWorkflowNode throws an error, create a failed result
      console.error(`Error executing node ${node.id}:`, error);
      result = {
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
      };
    }
    results.push(result);

    // Stop executing further nodes if the current node failed
    if (!result.success) {
      failed = true;

      await updateWorkflowRun(runId!, results, startTime, 'failed');

      return results;
    }
  }

  await updateWorkflowRun(runId!, results, startTime, !failed ? 'completed' : 'failed');

  return results;
}

async function updateWorkflowRun(
  runId: string,
  results: EnhancedNodeExecutionResult[],
  startTime: number,
  status: 'completed' | 'failed',
  errorMessage?: string,
) {
  try {
    console.log(`[updateWorkflowRun] Starting update for run ${runId} with status: ${status}`);
    await connectToDatabase();
    console.log(`[updateWorkflowRun] Connected to database`);

    const executionTime = Date.now() - startTime;
    const successfulNodes = results.filter((r) => r.success).length;
    const failedNodes = results.filter((r) => !r.success).length;
    const totalNodes = results.length;

    console.log(`[updateWorkflowRun] Updating run ${runId}:`, {
      status,
      totalNodes,
      successfulNodes,
      failedNodes,
      executionTime,
    });

    const updateData = {
      status,
      results: results.map((r) => ({
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
      completedAt: new Date(),
      executionTime,
      ...(errorMessage && { error: errorMessage }),
    };

    const updatedRun = await WorkflowRun.findByIdAndUpdate(runId, updateData, { new: true });

    if (!updatedRun) {
      console.error(`[updateWorkflowRun] Failed to find workflow run with id: ${runId}`);
    } else {
      console.log(`[updateWorkflowRun] Successfully updated workflow run ${runId} with status: ${status}`);
      console.log(`[updateWorkflowRun] Updated run status in DB:`, updatedRun.status);
    }
  } catch (error) {
    console.error('[updateWorkflowRun] Error updating workflow run:', error);
    console.error('[updateWorkflowRun] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    // Don't throw - we don't want to fail the workflow just because we couldn't update the run record
  }
}
