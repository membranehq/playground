import { nanoid } from 'nanoid';

interface SessionData {
  id: string;
  opencodeSessionId: string;
  createdAt: Date;
  lastActivity: Date;
}

class SessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  createSession(opencodeSessionId: string): string {
    const sessionId = nanoid();
    const now = new Date();

    this.sessions.set(sessionId, {
      id: sessionId,
      opencodeSessionId,
      createdAt: now,
      lastActivity: now,
    });

    console.log(`[SessionManager] Created session ${sessionId} -> OpenCode session ${opencodeSessionId}`);
    return sessionId;
  }

  getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if session has expired
    const now = Date.now();
    if (now - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
      console.log(`[SessionManager] Session ${sessionId} expired`);
      this.sessions.delete(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = new Date();
    return session;
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    console.log(`[SessionManager] Deleted session ${sessionId}`);
  }

  cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[SessionManager] Cleaned up ${cleaned} expired sessions`);
    }
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  switchSession(userSessionId: string, newOpencodeSessionId: string): void {
    const session = this.sessions.get(userSessionId);
    if (session) {
      console.log(
        `[SessionManager] Switching session ${userSessionId} from ${session.opencodeSessionId} to ${newOpencodeSessionId}`,
      );
      session.opencodeSessionId = newOpencodeSessionId;
      session.lastActivity = new Date();
    } else {
      console.log(`[SessionManager] Session ${userSessionId} not found, creating new one`);
      this.createSession(newOpencodeSessionId);
    }
  }
}

// Singleton instance
export const sessionManager = new SessionManager();

// Cleanup expired sessions every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      sessionManager.cleanupExpiredSessions();
    },
    5 * 60 * 1000,
  );
}
