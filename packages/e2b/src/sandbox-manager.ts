/**
 * Persistent E2B Sandbox Manager
 * The sandbox IS the agent's remote work environment (bolt.new / lovable / replit style):
 * one long-lived sandbox per workspace, reused across every tool call instead of
 * create/kill per call. The local `workspace/` dir stays a live mirror of the sandbox
 * so the code explorer and preview keep working.
 */

import fs from 'fs/promises';
import path from 'path';
import { Sandbox } from 'e2b';

const SANDBOX_TIMEOUT_MS = Number(process.env.E2B_SANDBOX_TIMEOUT_MS) || 3_600_000; // 1h, re-extended at each use
const SANDBOX_PROJECT_ROOT = process.env.E2B_PROJECT_PATH || '/home/user/project';

const WORKSPACE_ROOT = path.join(process.cwd(), 'workspace');
const STATE_FILE = path.join(WORKSPACE_ROOT, '.e2b-sandbox.json');

const SYNC_IGNORE = new Set(['node_modules', '.git', '.e2b-sandbox.json', 'dist']);
const MAX_SYNC_DOWN_FILES = 500;
const MAX_SYNC_DOWN_FILE_BYTES = 2 * 1024 * 1024;

let inProcessSandbox: Sandbox | null = null;

function resolveApiKey(dynamicApiKey?: string): string {
  const key = (dynamicApiKey || process.env.E2B_API_KEY || '').trim();
  return key && !key.startsWith('dummy') ? key : '';
}

export function isE2BEnabled(dynamicApiKey?: string): boolean {
  return resolveApiKey(dynamicApiKey).length > 0;
}

async function persistSandboxId(sandboxId: string) {
  try {
    await fs.mkdir(WORKSPACE_ROOT, { recursive: true });
    await fs.writeFile(
      STATE_FILE,
      JSON.stringify({ sandboxId, updatedAt: new Date().toISOString() }, null, 2),
      'utf-8',
    );
  } catch {
    // best-effort
  }
}

async function readPersistedSandboxId(): Promise<string | null> {
  try {
    const raw = JSON.parse(await fs.readFile(STATE_FILE, 'utf-8'));
    return typeof raw?.sandboxId === 'string' ? raw.sandboxId : null;
  } catch {
    return null;
  }
}

async function clearPersistedSandboxId() {
  try {
    await fs.unlink(STATE_FILE);
  } catch {
    // ignore
  }
}

/**
 * Sync the local workspace directory into the sandbox (local -> remote).
 * Used when a fresh sandbox is provisioned so the agent starts with the current project.
 */
export async function syncWorkspaceToSandbox(sandbox: Sandbox): Promise<{ files: number }> {
  let count = 0;

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(WORKSPACE_ROOT, fullPath).split(path.sep).join('/');
      if (SYNC_IGNORE.has(entry.name) || SYNC_IGNORE.has(relPath)) continue;
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          await sandbox.files.write(path.posix.join(SANDBOX_PROJECT_ROOT, relPath), content);
          count++;
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  await fs.mkdir(WORKSPACE_ROOT, { recursive: true });
  await walk(WORKSPACE_ROOT);
  return { files: count };
}

/**
 * Mirror sandbox files back to the local workspace (remote -> local).
 * Used after remote executions so files created inside the sandbox
 * (install scripts, scaffolding, generated code...) are visible in the
 * code explorer and preview.
 */
export async function syncSandboxToLocal(sandbox: Sandbox): Promise<{ files: number }> {
  let count = 0;

  async function walk(dir: string) {
    if (count >= MAX_SYNC_DOWN_FILES) return;
    let entries;
    try {
      entries = await sandbox.files.list(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (count >= MAX_SYNC_DOWN_FILES) return;
      const relPath = entry.path.startsWith(SANDBOX_PROJECT_ROOT + '/')
        ? entry.path.slice(SANDBOX_PROJECT_ROOT.length + 1)
        : entry.path.replace(/^\/+/, '');
      if (!relPath || SYNC_IGNORE.has(relPath.split('/')[0])) continue;
      if (entry.type === 'dir') {
        await walk(entry.path);
      } else if (entry.type === 'file') {
        try {
          if (entry.size > MAX_SYNC_DOWN_FILE_BYTES) continue;
          const content = await sandbox.files.read(entry.path, { format: 'bytes' });
          const localPath = path.resolve(WORKSPACE_ROOT, relPath);
          if (!localPath.startsWith(WORKSPACE_ROOT)) continue;
          await fs.mkdir(path.dirname(localPath), { recursive: true });
          await fs.writeFile(localPath, Buffer.from(content));
          count++;
        } catch {
          // skip unreadable/binary entries
        }
      }
    }
  }

  await walk(SANDBOX_PROJECT_ROOT);
  return { files: count };
}

async function isSandboxAlive(sandbox: Sandbox): Promise<boolean> {
  try {
    await sandbox.commands.run('pwd', { timeoutMs: 5_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get or create the persistent sandbox for this workspace.
 * - immediate in-process reuse
 * - reconnect to the persisted sandboxId (E2B auto-resumes paused sandboxes)
 * - else create a fresh sandbox and upload the local project into it
 * Returns null when E2B is not configured (E2B_API_KEY missing).
 */
export async function getOrCreateSandbox(dynamicApiKey?: string): Promise<Sandbox | null> {
  const apiKey = resolveApiKey(dynamicApiKey);
  if (!apiKey) return null;

  if (inProcessSandbox && (await isSandboxAlive(inProcessSandbox))) {
    void inProcessSandbox.setTimeout(SANDBOX_TIMEOUT_MS).catch(() => {});
    return inProcessSandbox;
  }
  if (inProcessSandbox) inProcessSandbox = null;

  const sandboxId = await readPersistedSandboxId();
  if (sandboxId) {
    try {
      const sandbox = await Sandbox.connect(sandboxId, { apiKey });
      if (await isSandboxAlive(sandbox)) {
        inProcessSandbox = sandbox;
        void sandbox.setTimeout(SANDBOX_TIMEOUT_MS).catch(() => {});
        return sandbox;
      }
      await sandbox.kill().catch(() => {});
    } catch {
      await clearPersistedSandboxId();
    }
  }

  const sandbox = await Sandbox.create({ apiKey, timeoutMs: SANDBOX_TIMEOUT_MS });
  try {
    await sandbox.commands.run(`mkdir -p ${SANDBOX_PROJECT_ROOT}`);
    await syncWorkspaceToSandbox(sandbox);
    await persistSandboxId(sandbox.sandboxId);
    inProcessSandbox = sandbox;
    return sandbox;
  } catch (syncErr) {
    await sandbox.kill().catch(() => {});
    throw syncErr;
  }
}

export async function stopSandbox(): Promise<{ stopped: boolean }> {
  let stopped = false;
  if (inProcessSandbox) {
    await inProcessSandbox.kill().catch(() => {});
    inProcessSandbox = null;
    stopped = true;
  }
  await clearPersistedSandboxId();
  return { stopped };
}

export function getSandboxStatus(dynamicApiKey?: string) {
  return {
    enabled: isE2BEnabled(dynamicApiKey),
    active: inProcessSandbox != null,
    sandboxId: inProcessSandbox?.sandboxId ?? null,
    projectRoot: SANDBOX_PROJECT_ROOT,
    timeoutMs: SANDBOX_TIMEOUT_MS,
  };
}
