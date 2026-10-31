/**
 * Shell Execution Tool
 * Executes terminal commands in the agent's remote work environment:
 * the persistent E2B Cloud Sandbox (local workspace fallback handled by runE2BCommand).
 */

import { runE2BCommand } from '@packages/e2b/src/e2b-agent-tools.ts';

export const shellTool = {
  name: 'shell',
  description: 'Exécuter une commande terminal shell (bash/sh) dans l\'environnement distant E2B où l\'agent travaille.',
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

    return await runE2BCommand(command);
  },
};
