import type { Plugin } from '@opencode-ai/plugin';
import { InteractiveToolName, InteractiveToolStatus } from '../shared/constants.js';
import { getToolOutput } from './utils/index.js';

const INTERACTIVE_TOOL_NAMES = new Set(Object.values(InteractiveToolName));

/**
 * This plugin automatically interrupts the OpenCode session
 * when an interactive tool returns awaiting_user_input status,
 * preventing the agent from continuing to think while waiting for user input.
 *
 * This enables a user feedback loop where:
 * 1. Agent calls an interactive tool (e.g., request-test-connection)
 * 2. Tool returns { status: 'awaiting_user_input', ... }
 * 3. This plugin detects the status and marks it for abort
 * 4. Once the tool call is completed, the session is aborted
 * 5. User sees UI prompt and provides input
 */
export const plugin: Plugin = async ({ client }) => {
  // Track interactive tool calls that need session abort after tool call completion
  const interactiveToolCalls = new Map<string, string>();

  return {
    'tool.execute.after': async (input, output) => {
      if (!INTERACTIVE_TOOL_NAMES.has(input.tool)) {
        return;
      }

      const toolOutput = getToolOutput(output);
      if (!toolOutput) {
        return;
      }

      try {
        const result = JSON.parse(toolOutput);

        if (result.status === InteractiveToolStatus.AWAITING_USER_INPUT) {
          interactiveToolCalls.set(input.callID, input.sessionID);
        }
      } catch (error) {
        // Ignore parse errors
      }
    },

    event: async (input) => {
      // We can't abort session directly in 'tool.execute.after', because OpenCode will mark the tool call itself as aborted
      // + this way we're also losing tool input (that we rely on for UI rendering), since OpenCode cleans it up
      // Instead, we let the tool call complete successfully and abort right after
      const event = input.event;

      if (event.type !== 'message.part.updated') {
        return;
      }

      const part = event.properties.part;

      if (part.type !== 'tool' || part.state.status !== 'completed') {
        return;
      }

      if (!INTERACTIVE_TOOL_NAMES.has(part.tool)) {
        return;
      }

      const sessionId = interactiveToolCalls.get(part.callID);
      if (!sessionId) {
        return;
      }

      interactiveToolCalls.delete(part.callID);

      try {
        await client.session.abort({ path: { id: sessionId } });
      } catch (error) {
        // Silently fail if abort fails
      }
    },
  };
};
