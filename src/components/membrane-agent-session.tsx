'use client';

import { Loader2, CheckCircle2, AlertCircle, Blocks, ChevronRight } from 'lucide-react';
import { useMembraneSessionStatus } from '@/hooks/use-membrane-session-status';

interface MembraneAgentSessionProps {
  part: any; // Tool part with state containing sessionId
  onShowDetails: (sessionId: string) => void;
}

/**
 * Special widget for membrane_createAgentSession tool calls.
 * Shows "Building integrations with Membrane" status and a "Show details" button.
 */
export function MembraneAgentSession({ part, onShowDetails }: MembraneAgentSessionProps) {
  // Extract session ID from tool output (the tool returns the created session ID)
  const sessionId = extractSessionId(part);

  // Fetch actual session status from Membrane API
  const { state: sessionState, isLoading } = useMembraneSessionStatus(sessionId);

  const handleShowDetails = () => {
    if (sessionId) {
      onShowDetails(sessionId);
    }
  };

  // Determine display state
  const isBusy = isLoading || sessionState === 'busy';
  const isIdle = !isLoading && sessionState === 'idle';
  const isError = !isLoading && sessionState === 'error';

  return (
    <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-neutral-200 flex items-center justify-center">
          <Blocks className="w-5 h-5 text-neutral-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-neutral-800">
              Building integrations
            </span>
            {isBusy && (
              <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" />
            )}
            {isIdle && (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
            {isError && (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
          <p className="text-sm text-neutral-500 mt-0.5">
            {isBusy && 'Membrane Agent is working...'}
            {isIdle && 'Integration built successfully'}
            {isError && 'An error occurred'}
          </p>
        </div>
      </div>

      {sessionId && (
        <button
          onClick={handleShowDetails}
          className="mt-3 flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          Show details
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {!sessionId && (
        <p className="mt-3 text-xs text-neutral-400">
          Waiting for session to start...
        </p>
      )}
    </div>
  );
}

/**
 * Extract the Membrane Agent session ID from the tool part.
 * - For membrane_createAgentSession: session ID is in the output
 * - For membrane_sendAgentSessionMessage: session ID is in input.params.id
 */
function extractSessionId(part: any): string | null {
  // Try to get from input.params.id (used by membrane_sendAgentSessionMessage)
  if (part.state?.input?.params?.id) {
    return part.state.input.params.id;
  }

  // Try to get from output (used by membrane_createAgentSession after completion)
  if (part.state?.output) {
    try {
      // Output might be a JSON string
      const output = typeof part.state.output === 'string'
        ? JSON.parse(part.state.output)
        : part.state.output;

      if (output.sessionId) return output.sessionId;
      if (output.id) return output.id;
    } catch {
      // Output is not JSON, might be the session ID directly
      if (typeof part.state.output === 'string' && part.state.output.startsWith('ses_')) {
        return part.state.output;
      }
    }
  }

  return null;
}
