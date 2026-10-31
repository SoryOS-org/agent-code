/**
 * Real PTY Session Manager for the persistent E2B sandbox.
 * One long-lived interactive bash session inside the sandbox, fanned out to
 * SSE clients: real streaming commands, resize, and auto-recreation if the
 * shell dies.
 */

import { Sandbox } from 'e2b';
import { getOrCreateSandbox, SANDBOX_PROJECT_ROOT } from './sandbox-manager.js';

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const BACKLOG_LIMIT = 200; // recent output chunks replayed to new SSE clients
const PTY_TIMEOUT_MS = 3_600_000;

interface PtySession {
  pid: number;
  sandboxId: string;
  cols: number;
  rows: number;
}

const subscribers = new Set<(chunk: string) => void>();
let backlog: string[] = [];
let session: PtySession | null = null;

// Strip ANSI escape codes (colors, cursor moves, bracketed paste...) — the SSE
// terminal UI renders plain text chunks.
const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]|\x1b\][^\x07]*(?:\x07|\x1b\\)|\x1b[()][0-9A-B]/g;

function emit(chunk: string) {
  const clean = chunk.replace(/[^\x20-\x7E\x0A]/g, ' ');
  backlog.push(clean);
  if (backlog.length > BACKLOG_LIMIT) backlog.splice(0, backlog.length - BACKLOG_LIMIT);
  for (const fn of [...subscribers]) {
    try {
      fn(clean);
    } catch {
      subscribers.delete(fn);
    }
  }
}

export function subscribePty(fn: (chunk: string) => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

export function getPtyBacklog(): string[] {
  return [...backlog];
}

export function getPtySessionStatus() {
  return {
    connected: session != null,
    pid: session?.pid ?? null,
    cols: session?.cols ?? null,
    rows: session?.rows ?? null,
  };
}

async function spawnSession(sandbox: Sandbox, cols?: number, rows?: number): Promise<PtySession> {
  const decoder = new TextDecoder('utf-8');
  const handle = await sandbox.pty.create({
    cols: cols ?? DEFAULT_COLS,
    rows: rows ?? DEFAULT_ROWS,
    cwd: SANDBOX_PROJECT_ROOT,
    timeoutMs: PTY_TIMEOUT_MS,
    onData: (bytes) => {
      const text = decoder.decode(bytes, { stream: true });
      if (text) emit(text);
    },
  });

  handle.wait().finally(() => {
    if (session?.pid === handle.pid) {
      session = null; // shell exited, next interactive call spawns a fresh one
    }
  });

  const s: PtySession = {
    pid: handle.pid,
    sandboxId: sandbox.sandboxId,
    cols: cols ?? DEFAULT_COLS,
    rows: rows ?? DEFAULT_ROWS,
  };
  session = s;
  emit(`[Terminal E2B connecté — sandbox ${s.sandboxId}]\r\n`);
  return s;
}

/**
 * Ensure a bash PTY session exists in the persistent sandbox.
 * Returns the current session, spawning a new bash shell when needed.
 */
export async function ensurePtySession(dynamicApiKey?: string, cols?: number, rows?: number) {
  const sandbox = await getOrCreateSandbox(dynamicApiKey);
  if (!sandbox) throw new Error('E2B non configuré (E2B_API_KEY absent)');

  if (session && session.sandboxId === sandbox.sandboxId) {
    return session;
  }

  if (session) {
    // sandbox switched; recreate (old pid dies with the old sandbox)
    session = null;
  }

  return await spawnSession(sandbox, cols, rows);
}

/** Send raw user input (including '\n') to the PTY. */
export async function writePtyInput(data: string, dynamicApiKey?: string) {
  const sandbox = await getOrCreateSandbox(dynamicApiKey);
  if (!sandbox) throw new Error('E2B non configuré (E2B_API_KEY absent)');

  if (!session || session.sandboxId !== sandbox.sandboxId) {
    await spawnSession(sandbox, DEFAULT_COLS, DEFAULT_ROWS);
  }

  const encoded = new TextEncoder().encode(data);
  await sandbox.pty.sendInput(session!.pid, encoded);
  return { sent: encoded.length };
}

/** Resize the PTY window (cols/rows). */
export async function resizePty(cols: number, rows: number, dynamicApiKey?: string) {
  if (!session) {
    await ensurePtySession(dynamicApiKey, cols, rows);
    return { resized: false };
  }
  const sandbox = await getOrCreateSandbox(dynamicApiKey);
  if (!sandbox) throw new Error('E2B non configuré (E2B_API_KEY absent)');
  await sandbox.pty.resize(session.pid, { cols, rows });
  session.cols = cols;
  session.rows = rows;
  return { resized: true };
}

/** Terminate the interactive session (the sandbox itself stays alive). */
export async function stopPtySession(dynamicApiKey?: string) {
  if (!session) return { stopped: false };
  const sandbox = await getOrCreateSandbox(dynamicApiKey).catch(() => null);
  let killed = false;
  if (sandbox) {
    killed = await sandbox.pty.kill(session.pid).catch(() => false);
  }
  session = null;
  subscribers.clear();
  backlog = [];
  return { stopped: true, killed };
}
