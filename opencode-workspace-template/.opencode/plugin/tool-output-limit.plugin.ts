import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { toJsonSchema } from './utils/to-json-schema';
import { getToolOutput } from './utils';

import type { Plugin } from '@opencode-ai/plugin';

// 40k is opencode's tool output limit before it errors, our limit should be significantly lower
const DEFAULT_TOKENS_LIMIT = 3_000;

const limit = Number(process.env.MEMBRANE_AGENT_TOOL_OUTPUT_TOKENS_LIMIT) || DEFAULT_TOKENS_LIMIT;

const ALLOWED_TOOLS = [
  /^membrane_/, // MCP tools starting with 'membrane_'
  /^runcode$/,
];

function shouldApplyLimit(toolName: string): boolean {
  return ALLOWED_TOOLS.some((pattern) => pattern.test(toolName));
}

export const plugin: Plugin = async ({ client, $ }) => ({
  'tool.execute.after': async (input, output) => {
    if (!output) return;

    if (!shouldApplyLimit(input.tool)) {
      return;
    }

    const outputString = getToolOutput(output);
    if (!outputString) {
      return;
    }

    const tokens = calcTokens(outputString);

    if (tokens < limit) return; // within limit, do nothing

    // when we exceed the limit, we write the output to a file
    // and mutate the output to return a helpful message

    const filepath = writeOutputToFile(input.tool, outputString);

    const replacementMessage = generateInstructiveMessage(input.tool, filepath, outputString);

    if ('content' in output && output.content?.[0]?.text) {
      output.content[0].text = replacementMessage;
    } else {
      output.output = replacementMessage;
    }
  },
});

function generateInstructiveMessage(toolName: string, filepath: string, output: string): string {
  const schema = generateSchemaFromOutput(output);

  return `Tool ${toolName} output too big to fit into context (limit: ${limit} tokens). Full output saved to: ${filepath}

Response Structure (schema):
${schema}

IMPORTANT: Do NOT load the entire file into context. Use targeted queries with 'runcode' tool to extract only the information you need.
`;
}

function calcTokens(str: string) {
  // 4 chars per token is a common heuristic
  return str.length / 4;
}

function writeOutputToFile(toolName: string, output: string): string {
  const outputDir = join(process.cwd(), 'tool-outputs');
  mkdirSync(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedToolName = toolName.replace(/[/\\:*?"<>|]/g, '_');
  const filename = `${sanitizedToolName}_${timestamp}.json`;
  const filepath = join(outputDir, filename);

  // Try to parse and pretty-print JSON, fallback to raw text
  let formattedOutput = output;
  try {
    const parsed = JSON.parse(output);
    formattedOutput = JSON.stringify(parsed, null, 2);
  } catch {
    // Not JSON, keep as is
  }

  writeFileSync(filepath, formattedOutput, 'utf-8');
  return filepath;
}

function generateSchemaFromOutput(output: string): string {
  try {
    const parsed = JSON.parse(output);

    const schema = toJsonSchema(parsed);

    return JSON.stringify(schema, null, 2);
  } catch {
    return '<non-JSON response>';
  }
}
