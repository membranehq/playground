import type { Hooks } from '@opencode-ai/plugin';

export type ToolExecuteAfterOutput = Parameters<NonNullable<Hooks['tool.execute.after']>>[1];

export type FastMCPToolOutputFormat = {
  content?: {
    type: 'text';
    text: string;
  }[];
};

/**
 * Extracts the actual tool output string from OpenCode's output structure or FastMCP output structure.
 */
export function getToolOutput(output: ToolExecuteAfterOutput | FastMCPToolOutputFormat): string | undefined {
  if ('output' in output && output.output) {
    return output.output;
  }

  if ('content' in output && output.content?.[0]?.text) {
    return output.content[0].text;
  }

  return undefined;
}
