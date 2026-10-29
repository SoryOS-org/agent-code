/**
 * Full E2B Coding Agent Tools
 * Enables OpenCode / Codex / Replit style full workspace autonomy:
 * Code execution, file creation, file modification, terminal command execution in E2B Cloud Sandboxes.
 */

import { Sandbox } from 'e2b';
import { executeSecureCode } from './code-executor.js';

/**
 * Write or modify a file inside E2B Cloud Sandbox
 */
export async function writeE2BFile(path: string, content: string): Promise<{ success: boolean; path: string; message: string }> {
  const apiKey = process.env.E2B_API_KEY || 'e2b_36dc65b1815ea00af20407c9ba6f42d8c5f6487e';
  try {
    const sandbox = await Sandbox.create({ apiKey });
    const targetPath = path.startsWith('/') ? path : `/tmp/${path}`;
    await sandbox.files.write(targetPath, content);
    await sandbox.kill();

    return {
      success: true,
      path: targetPath,
      message: `Fichier "${targetPath}" créé et sauvegardé avec succès dans la Sandbox E2B.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      path,
      message: `Erreur d'écriture E2B : ${msg}`,
    };
  }
}

/**
 * Run arbitrary shell command inside E2B Cloud Sandbox
 */
export async function runE2BCommand(command: string): Promise<{ stdout: string; stderr: string; exitCode: number; executionTimeMs: number }> {
  const startTime = Date.now();
  const apiKey = process.env.E2B_API_KEY || 'e2b_36dc65b1815ea00af20407c9ba6f42d8c5f6487e';
  let sandbox: Sandbox | null = null;
  try {
    sandbox = await Sandbox.create({ apiKey });
    let stdout = '';
    let stderr = '';
    let exitCode = 0;

    try {
      const res = await sandbox.commands.run(command);
      stdout = res.stdout || '';
      stderr = res.stderr || '';
      exitCode = res.exitCode ?? 0;
    } catch (cmdErr: any) {
      if (cmdErr && typeof cmdErr === 'object' && ('exitCode' in cmdErr || 'stdout' in cmdErr || 'stderr' in cmdErr)) {
        stdout = cmdErr.stdout || '';
        stderr = cmdErr.stderr || cmdErr.message || '';
        exitCode = typeof cmdErr.exitCode === 'number' ? cmdErr.exitCode : 1;
      } else {
        throw cmdErr;
      }
    }

    try {
      await sandbox.kill();
    } catch {
      // ignore
    }

    return {
      stdout,
      stderr,
      exitCode,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    if (sandbox) {
      try {
        await sandbox.kill();
      } catch {
        // ignore
      }
    }
    const msg = err instanceof Error ? err.message : String(err);
    return {
      stdout: '',
      stderr: `Erreur d'exécution de commande E2B : ${msg}`,
      exitCode: 1,
      executionTimeMs: Date.now() - startTime,
    };
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
