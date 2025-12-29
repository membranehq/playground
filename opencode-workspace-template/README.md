# OpenCode Workspace

This directory contains all OpenCode-related configuration and runtime files.

## Files

- **opencode.json** - OpenCode configuration

  - Defines agent type, model, tools, and other settings
  - Read by OpenCode server on startup

- **AGENTS.md** - Instructions for the AI agent

  - Contains detailed instructions on how to use the `request-test-connection` tool
  - Explains how to test Membrane integrations
  - Read by OpenCode when running the agent

- **.opencode/tool/** - Custom OpenCode tools

  - `request-test-connection.ts` - Tool for requesting OAuth connections from users
  - Integrated with the frontend connection UI

- **.opencode/plugin/** - OpenCode plugins

  - `auto-interrupt.plugin.ts` - Automatically stops agent when interactive tool returns `awaiting_user_input`
  - `utils/index.ts` - Utility functions for plugin development

- **.opencode/shared/** - Shared constants

  - `constants.js` - Shared constants used by tools and plugins

- **opencode-messages.log** - Runtime logs (auto-generated, gitignored)
  - All OpenCode API requests and responses
  - Cleared on each app restart
  - Useful for debugging data structures

## Why a Separate Workspace?

OpenCode reads configuration files (opencode.json, AGENTS.md) from its current working directory. By isolating these files in a dedicated workspace:

1. **Separation of concerns** - OpenCode config doesn't clutter the main app directory
2. **Clear organization** - All OpenCode-related files in one place
3. **Easier debugging** - Logs are stored alongside configuration

## How It Works

The `lib/opencode-service.ts` temporarily changes the working directory to this folder when launching OpenCode, ensuring it reads the correct configuration files.
