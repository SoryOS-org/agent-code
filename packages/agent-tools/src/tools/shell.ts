/**
 * Shell Execution Tool
 * Executes terminal commands (bash, sh) inside the E2B Cloud Sandbox.
 */

import { runE2BCommand } from '@packages/opencode-e2b/src/e2b-agent-tools.ts';

export const shellTool = {
  name: 'shell',
  description: 'Exécuter une commande terminal shell (bash/sh) dans l\'environnement Sandbox E2B.',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'La commande shell à exécuter (ex: ls -la, cargo build, python3 script.py).' },
    },
    required: ['command'],
  },
  execute: async (args: Record<string, unknown>) => {
    const command = (args.command as string);
    if (!command) {
      return { stdout: '', stderr: 'Commande manquante', exitCode: 1 };
    }

    try {
      const { exec } = await import('child_process');
      const path = await import('path');
      const workspaceRoot = path.join(process.cwd(), 'workspace');

      return new Promise((resolve) => {
        exec(command, { cwd: workspaceRoot }, (error, stdout, stderr) => {
          resolve({
            stdout,
            stderr,
            exitCode: error ? error.code || 1 : 0,
            executionTimeMs: 0, // Not measured here for simplicity
          });
        });
      });
    } catch (err: any) {
      // Fallback to E2B
      return await runE2BCommand(command);
    }
  },
};
