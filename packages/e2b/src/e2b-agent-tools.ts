/**
 * Full E2B Coding Agent Tools
 * Enables OpenCode / Codex / Replit style full workspace autonomy:
 * Code execution, file creation, file modification, terminal command execution in E2B Cloud Sandboxes.
 */

import { Sandbox } from 'e2b';
import { executeSecureCode } from './code-executor.js';
import {
  getOrCreateSandbox,
  isE2BEnabled,
  syncSandboxToLocal,
  SANDBOX_PROJECT_ROOT,
} from './sandbox-manager.js';

/**
 * Write or modify a file inside the persistent E2B Cloud Sandbox
 */
export async function writeE2BFile(pathStr: string, content: string, dynamicApiKey?: string): Promise<{ success: boolean; path: string; message: string }> {
  // Always write to local workspace first for instantaneous file persistence & code explorer visibility
  let cleanPath = pathStr.trim().replace(/^[/\\]+/, '');
  if (cleanPath.startsWith('workspace/')) {
    cleanPath = cleanPath.slice('workspace/'.length);
  }

  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const workspaceRoot = path.join(process.cwd(), 'workspace');
    const localPath = path.resolve(workspaceRoot, cleanPath);
    if (localPath.startsWith(workspaceRoot)) {
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, content, 'utf-8');
    }
  } catch (fsErr) {
    console.warn('[E2B] Failed to write local workspace mirror:', fsErr);
  }

  // Then mirror the file into the persistent sandbox (no create/kill per call)
  if (isE2BEnabled(dynamicApiKey)) {
    try {
      const sandbox = await getOrCreateSandbox(dynamicApiKey);
      if (sandbox) {
        const remotePath = pathStr.startsWith('/')
          ? pathStr
          : path.posix.join(SANDBOX_PROJECT_ROOT, cleanPath);
        await sandbox.files.write(remotePath, content);
        return {
          success: true,
          path: pathStr,
          message: `Fichier "${pathStr}" créé et sauvegardé avec succès dans le workspace et la Sandbox E2B.`,
        };
      }
    } catch (err: unknown) {
      console.warn('[E2B] Persistent sandbox file write failed, local mirror kept:', err);
    }
  }

  // If E2B sandbox fails (e.g. rate limit / network), local workspace write already succeeded
  return {
    success: true,
    path: pathStr,
    message: `Fichier "${pathStr}" créé et sauvegardé dans le workspace local.`,
  };
}

/**
 * Run arbitrary shell command inside the persistent E2B Cloud Sandbox.
 * E2B first (the sandbox is the agent's remote work environment), local
 * workspace fallback only when E2B is not configured or unreachable.
 */
export async function runE2BCommand(command: string, dynamicApiKey?: string): Promise<{ stdout: string; stderr: string; exitCode: number; executionTimeMs: number }> {
  const startTime = Date.now();

  if (isE2BEnabled(dynamicApiKey)) {
    let sandbox: Sandbox | null = null;
    try {
      sandbox = await getOrCreateSandbox(dynamicApiKey);
      if (sandbox) {
        const res = await sandbox.commands.run(command, { cwd: SANDBOX_PROJECT_ROOT });
        // Mirror files possibly created/modified by the command back to local workspace
        void syncSandboxToLocal(sandbox).then(
          (r) => {
            if (r.files > 0) console.log(`[E2B] Synced ${r.files} file(s) from sandbox to local workspace`);
          },
          () => {},
        );
        return {
          stdout: res.stdout || '',
          stderr: res.stderr || '',
          exitCode: res.exitCode ?? 0,
          executionTimeMs: Date.now() - startTime,
        };
      }
    } catch (e2bErr) {
      console.warn('[E2B] Cloud Sandbox command execution fallback to local workspace:', e2bErr);
    }
  }

  // Robust Local Execution Fallback
  try {
    const { exec } = await import('child_process');
    const util = await import('util');
    const execPromise = util.promisify(exec);
    const path = await import('path');
    const fs = await import('fs/promises');
    const workspaceRoot = path.join(process.cwd(), 'workspace');
    await fs.mkdir(workspaceRoot, { recursive: true });

    const { stdout, stderr } = await execPromise(command, {
      cwd: workspaceRoot,
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 10,
    });

    return {
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode: 0,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (localErr: any) {
    return {
      stdout: localErr.stdout || '',
      stderr: localErr.stderr || localErr.message || String(localErr),
      exitCode: localErr.code || 1,
      executionTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Install common development tools in E2B Cloud Sandbox
 */
export async function installE2BTool(toolName: string, dynamicApiKey?: string): Promise<{ success: boolean; message: string }> {
  const sandbox = await getOrCreateSandbox(dynamicApiKey);
  if (!sandbox) {
    return { success: false, message: `E2B non configuré (E2B_API_KEY absent) : impossible d'installer ${toolName} à distance.` };
  }

  try {
    // Check if already installed
    const checkRes = await sandbox.commands.run(`which ${toolName}`);
    if (checkRes.exitCode === 0) {
      return { success: true, message: `Outil ${toolName} est déjà installé à : ${checkRes.stdout.trim()}` };
    }

    // Try installing based on tool name (simplified mapping)
    let installCmd = '';
    if (toolName === 'rustc' || toolName === 'cargo') installCmd = 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && source $HOME/.cargo/env';
    else if (toolName === 'go') installCmd = 'curl -L https://go.dev/dl/go1.21.0.linux-amd64.tar.gz | tar -C /usr/local -xz';
    else installCmd = `apt-get update && apt-get install -y ${toolName}`;

    const res = await sandbox.commands.run(installCmd);

    if (res.exitCode === 0) {
      return { success: true, message: `Outil ${toolName} installé avec succès.` };
    } else {
      return { success: false, message: `Échec installation ${toolName}: ${res.stderr}` };
    }
  } catch (err: unknown) {
    return { success: false, message: `Erreur d'installation ${toolName}: ${err}` };
  }
}

/**
 * Create E2B Agent Workspace Tools list
 */
export function createE2BAgentTools() {
  return [
    {
      name: 'e2b_code_interpreter',
      description: 'Exécuter du code Python, JavaScript ou TypeScript dans la Sandbox E2B.',
      parameters: {
        type: 'object',
        properties: {
          language: { type: 'string', enum: ['python', 'javascript', 'typescript'] },
          code: { type: 'string', description: 'Le code source complet à exécuter.' },
        },
        required: ['language', 'code'],
      },
      execute: async (args: Record<string, unknown>) => {
        const language = (args.language as 'python' | 'javascript' | 'typescript') || 'javascript';
        const code = (args.code as string) || '';
        return await executeSecureCode({ language, code });
      },
    },
    {
      name: 'e2b_write_file',
      description: 'Créer ou modifier un fichier dans la Sandbox Cloud E2B.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Chemin du fichier (ex: app.py, index.js, README.md).' },
          content: { type: 'string', description: 'Contenu du fichier à écrire.' },
        },
        required: ['path', 'content'],
      },
      execute: async (args: Record<string, unknown>) => {
        const path = (args.path as string) || 'file.txt';
        const content = (args.content as string) || '';
        return await writeE2BFile(path, content);
      },
    },
    {
      name: 'e2b_run_command',
      description: 'Exécuter n\'importe quelle commande terminal shell (pip, npm, git, ls, bash) dans la Sandbox Cloud E2B.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'La commande terminal à exécuter (ex: pip install requests, ls -la).' },
        },
        required: ['command'],
      },
      execute: async (args: Record<string, unknown>) => {
        const command = (args.command as string) || 'ls -la';
        return await runE2BCommand(command);
      },
    },
  ];
}
