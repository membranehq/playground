import fs from 'fs';
import path from 'path';

// Store the original CWD at module load time to avoid issues with CWD changes
const ORIGINAL_CWD = process.cwd();
const WORKSPACE_DIR = path.join(ORIGINAL_CWD, 'opencode-workspace-template');
const LOG_FILE = path.join(WORKSPACE_DIR, 'opencode-messages.log');

class OpenCodeLogger {
  constructor() {
    // Clear the log file on initialization
    this.clearLog();
  }

  clearLog() {
    try {
      if (fs.existsSync(LOG_FILE)) {
        fs.unlinkSync(LOG_FILE);
      }
      this.log('info', 'OpenCode message logger initialized', {});
    } catch (error) {
      console.error('[Logger] Failed to clear log file:', error);
    }
  }

  log(level: 'info' | 'error', message: string, data: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
    };

    const logLine = `\n${'='.repeat(80)}\n[${timestamp}] ${level.toUpperCase()}: ${message}\n${'-'.repeat(80)}\n${logEntry.data}\n`;

    try {
      fs.appendFileSync(LOG_FILE, logLine, 'utf-8');
    } catch (error) {
      console.error('[Logger] Failed to write to log file:', error);
    }
  }

  logRequest(sessionId: string, message: string) {
    this.log('info', `Request to session ${sessionId}`, { message });
  }

  logResponse(sessionId: string, response: any) {
    this.log('info', `Response from session ${sessionId}`, response);
  }

  logError(context: string, error: any) {
    this.log('error', context, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...error,
    });
  }
}

// Singleton instance
export const opencodeLogger = new OpenCodeLogger();
