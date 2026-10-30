/**
 * Secure Code Execution Tool using E2B Sandboxes with Robust Local Fallback
 */

import { Sandbox } from 'e2b';

export interface CodeExecutionArgs {
  language: 'python' | 'javascript' | 'typescript' | 'bash' | 'sh' | 'rust' | 'rs' | 'shell';
  code: string;
}

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  result?: string;
  executionTimeMs: number;
  environment: string;
}

export async function executeSecureCode(args: CodeExecutionArgs, dynamicApiKey?: string): Promise<CodeExecutionResult> {
  const startTime = Date.now();
  const { language, code } = args;

  if (!code || typeof code !== 'string') {
    return {
      stdout: '',
      stderr: 'Erreur : Code source vide ou invalide.',
      exitCode: 1,
      executionTimeMs: 0,
      environment: 'none',
    };
  }

  const apiKey = dynamicApiKey || process.env.E2B_API_KEY;

  if (apiKey && apiKey.trim().length > 0 && !apiKey.startsWith('dummy')) {
    try {
      const sandbox = await Sandbox.create({ apiKey });
      let output: { stdout?: string; stderr?: string; exitCode?: number } = {};

      const runCommandSafely = async (cmd: string) => {
        try {
          const res = await sandbox.commands.run(cmd);
          return { stdout: res.stdout || '', stderr: res.stderr || '', exitCode: res.exitCode ?? 0 };
        } catch (cmdErr: any) {
          if (cmdErr && typeof cmdErr === 'object' && ('exitCode' in cmdErr || 'stdout' in cmdErr || 'stderr' in cmdErr)) {
            return {
              stdout: cmdErr.stdout || '',
              stderr: cmdErr.stderr || cmdErr.message || '',
              exitCode: typeof cmdErr.exitCode === 'number' ? cmdErr.exitCode : 1,
            };
          }
          throw cmdErr;
        }
      };

      if (language === 'python' || language === ('py' as any)) {
        await sandbox.files.write('/tmp/main.py', code);
        output = await runCommandSafely('python3 /tmp/main.py');
      } else if (language === 'bash' || language === ('sh' as any) || language === ('shell' as any)) {
        await sandbox.files.write('/tmp/run.sh', code);
        output = await runCommandSafely('bash /tmp/run.sh');
      } else {
        await sandbox.files.write('/tmp/main.js', code);
        output = await runCommandSafely('node /tmp/main.js');
      }

      try {
        await sandbox.kill();
      } catch {}

      return {
        stdout: output.stdout || '',
        stderr: output.stderr || '',
        exitCode: output.exitCode ?? 0,
        result: output.stdout,
        executionTimeMs: Date.now() - startTime,
        environment: 'E2B Cloud Secure Sandbox',
      };
    } catch (e2bErr) {
      console.warn('[E2B] Cloud Sandbox execution fallback to local runtime:', e2bErr);
    }
  }

  // Local execution fallback
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { exec } = await import('child_process');
    const util = await import('util');
    const execPromise = util.promisify(exec);
    const workspaceRoot = path.join(process.cwd(), 'workspace');
    await fs.mkdir(workspaceRoot, { recursive: true });

    if (language === 'python' || language === ('py' as any)) {
      const filePath = path.join(workspaceRoot, 'script_' + Date.now() + '.py');
      await fs.writeFile(filePath, code, 'utf-8');
      const { stdout, stderr } = await execPromise(`python3 ${filePath}`, { timeout: 15000 });
      await fs.unlink(filePath).catch(() => {});
      return {
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: 0,
        result: stdout,
        executionTimeMs: Date.now() - startTime,
        environment: 'Local Python Runtime',
      };
    } else {
      const filePath = path.join(workspaceRoot, 'script_' + Date.now() + '.js');
      await fs.writeFile(filePath, code, 'utf-8');
      const { stdout, stderr } = await execPromise(`node ${filePath}`, { timeout: 15000 });
      await fs.unlink(filePath).catch(() => {});
      return {
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: 0,
        result: stdout,
        executionTimeMs: Date.now() - startTime,
        environment: 'Local Node.js Runtime',
      };
    }
  } catch (localErr: any) {
    return {
      stdout: localErr.stdout || '',
      stderr: localErr.stderr || localErr.message || String(localErr),
      exitCode: 1,
      executionTimeMs: Date.now() - startTime,
      environment: 'Local Runtime Error',
    };
  }
}

export function createE2BCodeInterpreterTool() {
  return {
    name: 'e2b_code_interpreter',
    description: 'Exécuter du code Python ou JavaScript de manière sécurisée.',
    parameters: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          enum: ['python', 'javascript', 'typescript'],
        },
        code: {
          type: 'string',
        },
      },
      required: ['language', 'code'],
    },
    execute: async (args: Record<string, unknown>) => {
      const language = (args.language as 'python' | 'javascript' | 'typescript') || 'javascript';
      const code = (args.code as string) || '';
      return await executeSecureCode({ language, code });
    },
  };
}
