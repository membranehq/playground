'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import type { IWorkflowRunResult } from '@/lib/workflow/models/workflow-run'
import { cn } from '@/lib/utils'

interface WorkflowNode {
  id: string
  name: string
  type?: string
}

interface NodeResultViewerProps {
  selectedNodeId: string | null
  runResults: IWorkflowRunResult[]
  nodesSnapshot?: WorkflowNode[]
}

export function NodeResultViewer({ selectedNodeId, runResults, nodesSnapshot }: NodeResultViewerProps) {
  const selectedResult = selectedNodeId
    ? runResults.find(result => result.nodeId === selectedNodeId)
    : null

  const selectedNode = selectedNodeId && nodesSnapshot
    ? nodesSnapshot.find(node => node.id === selectedNodeId)
    : null

  if (!selectedNodeId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Select a Node
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Click on a node in the workflow to view its execution result.
          </p>
        </div>
      </div>
    )
  }

  if (!selectedResult) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Result Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            No execution result found for node {selectedNodeId}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-2">
          {selectedResult.success ? (
            <CheckCircle className="h-6 w-6 text-green-600" />
          ) : (
            <XCircle className="h-6 w-6 text-red-600" />
          )}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {selectedNode?.name || selectedResult.nodeId}
          </h3>
          <Badge
            variant={selectedResult.success ? 'default' : 'secondary'}
            className={cn(
              !selectedResult.success && "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
            )}
          >
            {selectedResult.success ? 'Success' : 'Failed'}
          </Badge>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {selectedResult.message}
        </p>
      </div>

      <div className="p-6 space-y-6 overflow-auto h-full">
        {/* Input */}
        {selectedResult.input != null && (
          <div className='border border-gray-200 dark:border-gray-800 rounded-lg p-4'>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Input
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <pre className="font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-auto">
                {JSON.stringify(selectedResult.input, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Output */}
        {selectedResult.output != null && (
          <div className='border border-gray-200 dark:border-gray-800 rounded-lg p-4'>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Output
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <pre className="font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-auto">
                {JSON.stringify(selectedResult.output, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Error Details */}
        {selectedResult.error && (
          <div>
            <h4 className="text-sm font-medium text-red-900 dark:text-red-100 mb-3">
              Error Details
            </h4>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 space-y-3">
              <div>
                <div className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                  Message:
                </div>
                <div className="text-sm text-red-800 dark:text-red-200">
                  {selectedResult.error.message}
                </div>
              </div>

              {selectedResult.error.code && (
                <div>
                  <div className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                    Code:
                  </div>
                  <div className="text-sm text-red-800 dark:text-red-200">
                    {selectedResult.error.code}
                  </div>
                </div>
              )}

              {selectedResult.error.details != null && (
                <div>
                  <div className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                    Details:
                  </div>
                  <pre className="font-mono text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap overflow-auto bg-red-100 dark:bg-red-900/30 rounded p-2">
                    {JSON.stringify(selectedResult.error.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No input, output or error */}
        {selectedResult.input == null && selectedResult.output == null && !selectedResult.error && (
          <div className="text-center py-8">
            <div className="text-gray-500 dark:text-gray-400">
              No additional data available for this node execution.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
