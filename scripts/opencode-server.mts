/**
 * Multi-Tenant OpenCode Proxy Server
 *
 * This script runs a proxy server that manages per-customer OpenCode instances.
 * Each customer gets their own OpenCode instance with isolated workspace and data directories.
 *
 * IMPORTANT: Workspace credentials (MEMBRANE_WORKSPACE_KEY/SECRET) are passed dynamically
 * via request headers from the frontend, NOT from environment variables.
 *
 * Used for both local development and production deployment.
 *
 * Environment Variables:
 * - OPENCODE_PROXY_PORT: Port for the proxy server (default: 1337)
 * - OPENCODE_PROXY_HOST: Hostname to bind to (default: 0.0.0.0)
 * - OPENCODE_BASE_PATH: Base path for customer workspaces and data (default: ./opencode-customers)
 * - OPENROUTER_API_KEY: OpenRouter API key
 *
 * Required Request Headers:
 * - x-workspace-key: Membrane workspace key
 * - x-workspace-secret: Membrane workspace secret
 *
 * API Routes (all prefixed with /:customerId):
 * - POST /:customerId/session.create - Create a new session
 * - POST /:customerId/session.prompt - Send a prompt to a session
 * - GET  /:customerId/session.messages - Get messages from a session
 * - GET  /:customerId/session.list - List all sessions
 * - POST /:customerId/session.share - Share a session
 * - POST /:customerId/session.abort - Abort a session
 * - POST /:customerId/session.delete - Delete a session and all its data
 * - GET  /:customerId/event.subscribe - Subscribe to SSE events
 */

// Load environment variables from .env.local and .env
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local first (higher priority), then .env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createOpencode, type Opencode } from '@opencode-ai/sdk';
import express, { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';

const PROXY_PORT = parseInt(process.env.OPENCODE_PROXY_PORT || '1337', 10);
const PROXY_HOST = process.env.OPENCODE_PROXY_HOST || '0.0.0.0';
const BASE_PATH = process.env.OPENCODE_BASE_PATH || path.join(process.cwd(), 'opencode-customers');
const TEMPLATE_PATH = path.join(process.cwd(), 'opencode-workspace-template');
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Types
// ============================================================================

interface WorkspaceCredentials {
  workspaceKey: string;
  workspaceSecret: string;
}

interface OpencodeInstance {
  customerId: string;
  opencodeInstance: Opencode;
  workspaceDir: string;
  dataDir: string;
  lastActivity: Date;
  // Store credentials hash to detect if they changed
  credentialsHash: string;
}

// ============================================================================
// Instance Manager
// ============================================================================

class OpencodeInstanceManager {
  private instances: Map<string, OpencodeInstance> = new Map();
  private initializationLocks: Map<string, Promise<OpencodeInstance>> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanupIdleInstances(), CLEANUP_INTERVAL_MS);
    console.log(`[InstanceManager] Started idle cleanup interval (every ${CLEANUP_INTERVAL_MS / 1000}s)`);
  }

  /**
   * Get or create an OpenCode instance for a customer.
   * Uses promise-based locking to prevent duplicate instance creation.
   * If credentials changed, will recreate the instance.
   */
  async getOrCreateInstance(customerId: string, credentials: WorkspaceCredentials): Promise<OpencodeInstance> {
    const credentialsHash = hashCredentials(credentials);

    // Check if instance already exists and is ready
    const existing = this.instances.get(customerId);
    if (existing) {
      // If credentials changed, shutdown old instance and create new one
      if (existing.credentialsHash !== credentialsHash) {
        console.log(`[InstanceManager] Credentials changed for ${customerId}, recreating instance`);
        await this.shutdownInstance(customerId);
      } else {
        existing.lastActivity = new Date();
        return existing;
      }
    }

    // Check if initialization is already in progress for this customer
    const pendingInit = this.initializationLocks.get(customerId);
    if (pendingInit) {
      console.log(`[InstanceManager] Waiting for existing initialization: ${customerId}`);
      return pendingInit;
    }

    // Start new initialization and store the promise as a lock
    console.log(`[InstanceManager] Creating new instance for: ${customerId}`);
    const initPromise = this._createInstance(customerId, credentials, credentialsHash);
    this.initializationLocks.set(customerId, initPromise);

    try {
      const instance = await initPromise;
      this.instances.set(customerId, instance);
      return instance;
    } finally {
      // Always clean up the lock
      this.initializationLocks.delete(customerId);
    }
  }

  /**
   * Create a new OpenCode instance for a customer.
   */
  private async _createInstance(
    customerId: string,
    credentials: WorkspaceCredentials,
    credentialsHash: string,
  ): Promise<OpencodeInstance> {
    const sanitizedId = sanitizeCustomerId(customerId);
    const workspaceDir = path.join(BASE_PATH, 'workspaces', sanitizedId);
    const dataDir = path.join(BASE_PATH, 'data', sanitizedId);

    console.log(`[InstanceManager] Setting up directories for ${customerId}`);
    console.log(`[InstanceManager]   Workspace: ${workspaceDir}`);
    console.log(`[InstanceManager]   Data: ${dataDir}`);

    // Ensure directories exist
    fs.mkdirSync(workspaceDir, { recursive: true });
    fs.mkdirSync(dataDir, { recursive: true });

    // Always re-initialize workspace from template to pick up any updates
    // (data directory is preserved separately)
    await copyTemplate(TEMPLATE_PATH, workspaceDir);

    // Generate config with dynamic credentials and customer ID
    const configPath = path.join(workspaceDir, 'opencode.json');
    const config = generateConfig(customerId, credentials);

    // Write the generated config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`[InstanceManager] Generated config for ${customerId}`);

    // Set XDG_DATA_HOME for this instance to use its own data directory
    const originalXdgDataHome = process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = dataDir;

    // Change to workspace directory
    const originalCwd = process.cwd();
    process.chdir(workspaceDir);

    try {
      console.log(`[InstanceManager] Creating OpenCode instance for ${customerId}...`);
      console.log(`[InstanceManager]   CWD: ${process.cwd()}`);
      console.log(`[InstanceManager]   XDG_DATA_HOME: ${process.env.XDG_DATA_HOME}`);

      // Create OpenCode instance
      const opencodeInstance = await createOpencode({
        hostname: '127.0.0.1',
        port: 0, // OS picks available port
        config,
      });

      console.log(`[InstanceManager] Started OpenCode for ${customerId} at ${opencodeInstance.server?.url}`);

      return {
        customerId,
        opencodeInstance,
        workspaceDir,
        dataDir,
        lastActivity: new Date(),
        credentialsHash,
      };
    } catch (error) {
      console.error(`[InstanceManager] Failed to create OpenCode instance for ${customerId}:`, error);
      throw error;
    } finally {
      // Restore original working directory and XDG_DATA_HOME
      process.chdir(originalCwd);
      if (originalXdgDataHome !== undefined) {
        process.env.XDG_DATA_HOME = originalXdgDataHome;
      } else {
        delete process.env.XDG_DATA_HOME;
      }
    }
  }

  /**
   * Shutdown an instance for a customer.
   */
  async shutdownInstance(customerId: string): Promise<void> {
    const instance = this.instances.get(customerId);
    if (!instance) return;

    console.log(`[InstanceManager] Shutting down instance for: ${customerId}`);
    try {
      instance.opencodeInstance.server?.close();
    } catch (error) {
      console.error(`[InstanceManager] Error shutting down instance for ${customerId}:`, error);
    }
    this.instances.delete(customerId);
  }

  /**
   * Cleanup idle instances.
   */
  private cleanupIdleInstances(): void {
    const now = new Date();
    const idleCustomers: string[] = [];

    for (const [customerId, instance] of this.instances) {
      const idleTime = now.getTime() - instance.lastActivity.getTime();
      if (idleTime > IDLE_TIMEOUT_MS) {
        idleCustomers.push(customerId);
      }
    }

    for (const customerId of idleCustomers) {
      console.log(`[InstanceManager] Cleaning up idle instance: ${customerId}`);
      this.shutdownInstance(customerId);
    }

    if (idleCustomers.length > 0) {
      console.log(`[InstanceManager] Cleaned up ${idleCustomers.length} idle instances`);
    }
  }

  /**
   * Shutdown all instances.
   */
  async shutdownAll(): Promise<void> {
    console.log(`[InstanceManager] Shutting down all instances...`);
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    for (const customerId of this.instances.keys()) {
      await this.shutdownInstance(customerId);
    }
  }

  /**
   * Get stats about active instances.
   */
  getStats(): { activeInstances: number; customers: string[] } {
    return {
      activeInstances: this.instances.size,
      customers: Array.from(this.instances.keys()),
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sanitize customer ID (email) for filesystem use.
 */
function sanitizeCustomerId(customerId: string): string {
  return customerId
    .replace(/@/g, '_at_')
    .replace(/\./g, '_dot_')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Hash credentials to detect changes.
 */
function hashCredentials(credentials: WorkspaceCredentials): string {
  // Simple hash for comparison purposes
  return Buffer.from(`${credentials.workspaceKey}:${credentials.workspaceSecret}`).toString('base64');
}

/**
 * Copy template files to workspace directory.
 */
async function copyTemplate(templateDir: string, targetDir: string): Promise<void> {
  console.log(`[InstanceManager] Copying template from ${templateDir} to ${targetDir}`);

  const filesToCopy = ['opencode-template.json', 'AGENTS.md'];

  // Copy individual files
  for (const file of filesToCopy) {
    const srcPath = path.join(templateDir, file);
    const dstPath = path.join(targetDir, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, dstPath);
      console.log(`[InstanceManager]   Copied: ${file}`);
    }
  }

  // Copy directories
  const directoriesToCopy = ['.opencode'];
  for (const dir of directoriesToCopy) {
    const srcDir = path.join(templateDir, dir);
    const dstDir = path.join(targetDir, dir);
    if (fs.existsSync(srcDir)) {
      copyDirectoryRecursive(srcDir, dstDir);
      console.log(`[InstanceManager]   Copied directory: ${dir}`);
    }
  }
}

/**
 * Recursively copy a directory.
 */
function copyDirectoryRecursive(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

/**
 * Generate OpenCode config with customer-specific settings and dynamic credentials.
 */
function generateConfig(customerId: string, credentials: WorkspaceCredentials): object {
  const templatePath = path.join(TEMPLATE_PATH, 'opencode-template.json');

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  const templateContent = fs.readFileSync(templatePath, 'utf-8');

  // Replace environment variables with actual values
  // MEMBRANE credentials come from request headers, OPENROUTER_API_KEY from env
  const configContent = templateContent
    .replace(/\$\{MEMBRANE_WORKSPACE_KEY\}/g, credentials.workspaceKey)
    .replace(/\$\{MEMBRANE_WORKSPACE_SECRET\}/g, credentials.workspaceSecret)
    .replace(/\$\{MEMBRANE_API_URI\}/g, process.env.MEMBRANE_API_URI || 'https://api.integration.app')
    .replace(/\$\{OPENROUTER_API_KEY\}/g, process.env.OPENROUTER_API_KEY || '');

  const config = JSON.parse(configContent);

  // Inject MEMBRANE_TEST_CUSTOMER_ID dynamically
  if (config.mcp?.membrane?.environment) {
    config.mcp.membrane.environment.MEMBRANE_TEST_CUSTOMER_ID = customerId;
  }

  return config;
}

/**
 * Extract workspace credentials from request headers.
 */
function getCredentialsFromRequest(req: Request): WorkspaceCredentials | null {
  const workspaceKey = req.headers['x-workspace-key'] as string;
  const workspaceSecret = req.headers['x-workspace-secret'] as string;

  if (!workspaceKey || !workspaceSecret) {
    return null;
  }

  return { workspaceKey, workspaceSecret };
}

// ============================================================================
// Express Server
// ============================================================================

const app = express();
app.use(express.json());

const instanceManager = new OpencodeInstanceManager();

/**
 * Serialize error for logging and response
 */
function serializeError(error: unknown): { message: string; stack?: string; details?: unknown } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      details: (error as any).cause || (error as any).data || undefined,
    };
  }
  return { message: String(error) };
}

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[Proxy] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const stats = instanceManager.getStats();
  res.json({
    status: 'ok',
    ...stats,
  });
});

// Middleware to get or create instance for customer
async function getInstanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const customerId = req.params.customerId;
  if (!customerId) {
    res.status(400).json({ error: 'Customer ID required' });
    return;
  }

  // Get credentials from headers
  const credentials = getCredentialsFromRequest(req);
  if (!credentials) {
    res.status(401).json({ error: 'Workspace credentials required (x-workspace-key, x-workspace-secret headers)' });
    return;
  }

  console.log(`[Proxy] Getting instance for customer: ${customerId}`);

  try {
    const instance = await instanceManager.getOrCreateInstance(customerId, credentials);
    (req as any).opencodeInstance = instance;
    console.log(`[Proxy] Got instance for ${customerId}, server URL: ${instance.opencodeInstance.server?.url}`);
    next();
  } catch (error) {
    const serialized = serializeError(error);
    console.error(`[Proxy] Error getting instance for ${customerId}:`, JSON.stringify(serialized, null, 2));
    res.status(500).json({ error: 'Failed to get OpenCode instance', details: serialized });
  }
}

// Session create
app.post('/:customerId/session.create', getInstanceMiddleware, async (req: Request, res: Response) => {
  const instance: OpencodeInstance = (req as any).opencodeInstance;
  const customerId = req.params.customerId;

  console.log(`[Proxy] Creating session for ${customerId}`);

  try {
    const response = await instance.opencodeInstance.client.session.create();
    console.log(`[Proxy] Session created:`, response.data?.id);
    res.json(response);
  } catch (error) {
    const serialized = serializeError(error);
    console.error(`[Proxy] Error creating session for ${customerId}:`, JSON.stringify(serialized, null, 2));
    res.status(500).json({ error: 'Failed to create session', details: serialized });
  }
});

// Session prompt
app.post('/:customerId/session.prompt', getInstanceMiddleware, async (req: Request, res: Response) => {
  const instance: OpencodeInstance = (req as any).opencodeInstance;
  const customerId = req.params.customerId;
  const { id, parts, agent } = req.body;

  console.log(`[Proxy] Sending prompt to session ${id} for ${customerId}`);

  try {
    const response = await instance.opencodeInstance.client.session.prompt({
      path: { id },
      body: { parts, agent },
    });
    console.log(`[Proxy] Prompt sent successfully`);
    res.json(response);
  } catch (error) {
    const serialized = serializeError(error);
    console.error(`[Proxy] Error sending prompt to ${id}:`, JSON.stringify(serialized, null, 2));
    res.status(500).json({ error: 'Failed to send prompt', details: serialized });
  }
});

// Session messages
app.get('/:customerId/session.messages', getInstanceMiddleware, async (req: Request, res: Response) => {
  const instance: OpencodeInstance = (req as any).opencodeInstance;
  const customerId = req.params.customerId;
  const sessionId = req.query.id as string;

  if (!sessionId) {
    res.status(400).json({ error: 'Session ID required' });
    return;
  }

  console.log(`[Proxy] Getting messages for session ${sessionId}, customer ${customerId}`);

  try {
    const response = await instance.opencodeInstance.client.session.messages({
      path: { id: sessionId },
    });
    console.log(`[Proxy] Got ${response.data?.length || 0} messages`);
    res.json(response);
  } catch (error) {
    const serialized = serializeError(error);
    console.error(`[Proxy] Error getting messages for ${sessionId}:`, JSON.stringify(serialized, null, 2));
    res.status(500).json({ error: 'Failed to get messages', details: serialized });
  }
});

// Session list
app.get('/:customerId/session.list', getInstanceMiddleware, async (req: Request, res: Response) => {
  const instance: OpencodeInstance = (req as any).opencodeInstance;
  const customerId = req.params.customerId;

  console.log(`[Proxy] Listing sessions for ${customerId}`);

  try {
    const response = await instance.opencodeInstance.client.session.list();
    console.log(`[Proxy] Found ${response.data?.length || 0} sessions`);
    res.json(response);
  } catch (error) {
    const serialized = serializeError(error);
    console.error(`[Proxy] Error listing sessions for ${customerId}:`, JSON.stringify(serialized, null, 2));
    res.status(500).json({ error: 'Failed to list sessions', details: serialized });
  }
});

// Session share
app.post('/:customerId/session.share', getInstanceMiddleware, async (req: Request, res: Response) => {
  const instance: OpencodeInstance = (req as any).opencodeInstance;
  const customerId = req.params.customerId;
  const { id } = req.body;

  console.log(`[Proxy] Sharing session ${id} for ${customerId}`);

  try {
    const response = await instance.opencodeInstance.client.session.share({
      path: { id },
    });
    res.json(response);
  } catch (error) {
    const serialized = serializeError(error);
    console.error(`[Proxy] Error sharing session ${id}:`, JSON.stringify(serialized, null, 2));
    res.status(500).json({ error: 'Failed to share session', details: serialized });
  }
});

// Session abort
app.post('/:customerId/session.abort', getInstanceMiddleware, async (req: Request, res: Response) => {
  const instance: OpencodeInstance = (req as any).opencodeInstance;
  const customerId = req.params.customerId;
  const { id } = req.body;

  console.log(`[Proxy] Aborting session ${id} for ${customerId}`);

  try {
    const response = await instance.opencodeInstance.client.session.abort({
      path: { id },
    });
    res.json(response);
  } catch (error) {
    const serialized = serializeError(error);
    console.error(`[Proxy] Error aborting session ${id}:`, JSON.stringify(serialized, null, 2));
    res.status(500).json({ error: 'Failed to abort session', details: serialized });
  }
});

// Session delete
app.post('/:customerId/session.delete', getInstanceMiddleware, async (req: Request, res: Response) => {
  const instance: OpencodeInstance = (req as any).opencodeInstance;
  const customerId = req.params.customerId;
  const { id } = req.body;

  console.log(`[Proxy] Deleting session ${id} for ${customerId}`);

  try {
    const response = await instance.opencodeInstance.client.session.delete({
      path: { id },
    });
    console.log(`[Proxy] Session ${id} deleted successfully`);
    res.json(response);
  } catch (error) {
    const serialized = serializeError(error);
    console.error(`[Proxy] Error deleting session ${id}:`, JSON.stringify(serialized, null, 2));
    res.status(500).json({ error: 'Failed to delete session', details: serialized });
  }
});

// Event subscribe (SSE) - credentials passed via query params since EventSource doesn't support headers
app.get('/:customerId/event.subscribe', async (req: Request, res: Response) => {
  const customerId = req.params.customerId;

  // For SSE, get credentials from query params since EventSource doesn't support headers
  const workspaceKey = req.query.workspaceKey as string;
  const workspaceSecret = req.query.workspaceSecret as string;

  if (!workspaceKey || !workspaceSecret) {
    res.status(401).json({ error: 'Workspace credentials required (workspaceKey, workspaceSecret query params)' });
    return;
  }

  const credentials: WorkspaceCredentials = { workspaceKey, workspaceSecret };

  console.log(`[Proxy] Getting instance for SSE customer: ${customerId}`);

  let instance: OpencodeInstance;
  try {
    instance = await instanceManager.getOrCreateInstance(customerId, credentials);
  } catch (error) {
    const serialized = serializeError(error);
    console.error(`[Proxy] Error getting instance for SSE ${customerId}:`, JSON.stringify(serialized, null, 2));
    res.status(500).json({ error: 'Failed to get OpenCode instance', details: serialized });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const subscription = await instance.opencodeInstance.client.event.subscribe();

    // Stream events to client
    const stream = subscription.stream;
    for await (const event of stream) {
      // Filter out non-critical errors:
      // 1. Auth errors from OpenCode cloud service (401)
      // 2. MessageAbortedError from auto-interrupt plugin (expected when interactive tools are used)
      const evt = event as any;
      const errorName = evt.error?.name;
      const statusCode = evt.error?.data?.statusCode;

      if (errorName === 'APIError' && (statusCode === 401 || statusCode === '401' || statusCode === 'unauthorized')) {
        console.log(`[Proxy] Filtering out cloud auth error for session ${evt.sessionID}`);
        continue;
      }

      if (errorName === 'MessageAbortedError') {
        console.log(
          `[Proxy] Filtering out MessageAbortedError for session ${evt.sessionID} (expected from auto-interrupt plugin)`,
        );
        continue;
      }

      // Log other errors for debugging
      if (evt.error) {
        console.log(`[Proxy] Event has error (not filtered):`, JSON.stringify(evt.error));
      }

      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  } catch (error) {
    console.error('[Proxy] Error in event stream:', error);
    res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
  } finally {
    res.end();
  }
});

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('[OpenCode Proxy] Starting multi-tenant OpenCode proxy server...');
  console.log('[OpenCode Proxy] Host:', PROXY_HOST);
  console.log('[OpenCode Proxy] Port:', PROXY_PORT);
  console.log('[OpenCode Proxy] Base path:', BASE_PATH);
  console.log('[OpenCode Proxy] Template path:', TEMPLATE_PATH);

  // Log env variable status (without revealing secrets)
  console.log('[OpenCode Proxy] Environment variables loaded:');
  console.log('  OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? 'set' : 'missing');
  console.log('  MEMBRANE_API_URI:', process.env.MEMBRANE_API_URI || '(using default)');
  console.log('[OpenCode Proxy] Note: MEMBRANE_WORKSPACE_KEY/SECRET are passed dynamically via request headers');

  // Ensure base directories exist
  fs.mkdirSync(path.join(BASE_PATH, 'workspaces'), { recursive: true });
  fs.mkdirSync(path.join(BASE_PATH, 'data'), { recursive: true });

  // Start Express server
  const server = app.listen(PROXY_PORT, PROXY_HOST, () => {
    console.log(`[OpenCode Proxy] Server listening at http://${PROXY_HOST}:${PROXY_PORT}`);
    console.log('[OpenCode Proxy] Ready to accept connections');
  });

  // Handle shutdown gracefully
  const shutdown = async () => {
    console.log('\n[OpenCode Proxy] Shutting down...');
    await instanceManager.shutdownAll();
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('[OpenCode Proxy] Failed to start:', error);
  process.exit(1);
});
