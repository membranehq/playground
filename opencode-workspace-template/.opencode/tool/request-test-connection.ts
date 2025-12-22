import { tool } from '@opencode-ai/plugin'
import { InteractiveToolStatus } from '../shared/constants.js'

export default tool({
  description:
    'Request user to create a test connection. Use this when you need to test a Membrane integration but no test connection exists. The tool will show a UI for the user to create a connection.',
  args: {
    integrationSelector: tool.schema
      .string()
      .describe('Membrane integration ID that should be used to create the connection'),
    integrationName: tool.schema
      .string()
      .describe('Human-readable name of the integration (e.g., "Linear", "HubSpot", "Salesforce") for display purposes'),
  },
  async execute(args: { integrationSelector: string; integrationName: string }) {
    return JSON.stringify({
      status: InteractiveToolStatus.AWAITING_USER_INPUT,
      args,
    })
  },
})
