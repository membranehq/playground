'use client';

import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput, type ToolUIPart } from './ai-elements/tool';
import { CodeBlock } from './code-block';

interface ToolExecutionProps {
  part: any; // ToolPart from OpenCode types
}

// Map our status to AI Elements ToolUIPart state
function mapStatus(status?: string): ToolUIPart['state'] {
  switch (status) {
    case 'completed':
      return 'output-available';
    case 'error':
      return 'output-error';
    case 'running':
      return 'input-available';
    default:
      return 'input-streaming';
  }
}

// Render input for runcode tool with syntax highlighting
function RuncodeInput({ code }: { code: string }) {
  return (
    <div className="px-4 pb-3">
      <div className="text-xs font-medium text-muted-foreground mb-2">Code</div>
      <CodeBlock code={code} language="typescript" />
    </div>
  );
}

export function ToolExecution({ part }: ToolExecutionProps) {
  const { tool, state } = part;
  const mappedState = mapStatus(state?.status);

  // Check if this is a runcode tool
  const isRuncode = tool === 'runcode';
  const hasInput = state?.input && Object.keys(state.input).length > 0;

  return (
    <Tool defaultOpen={false}>
      <ToolHeader
        title={state?.title || tool}
        type="tool-invocation"
        state={mappedState}
      />
      <ToolContent>
        {hasInput && (
          isRuncode && state.input.code ? (
            <RuncodeInput code={state.input.code} />
          ) : (
            <ToolInput input={state.input} />
          )
        )}
        {(state?.output || state?.error) && (
          <ToolOutput
            output={state.output}
            errorText={state.error}
          />
        )}
        {state?.time && (
          <div className="px-4 pb-3 text-xs text-muted-foreground">
            {state.time.end
              ? `Completed in ${((state.time.end - state.time.start) / 1000).toFixed(2)}s`
              : 'Running...'}
          </div>
        )}
      </ToolContent>
    </Tool>
  );
}
