/**
 * Code Interpreter Tool
 * Executes Python, JavaScript, TypeScript, Bash, or Rust code in E2B Sandbox.
 */

import { executeSecureCode } from '@packages/e2b/src/code-executor.ts';

export const codeInterpreterTool = {
  name: 'code_interpreter',
  description: 'Exécuter du code (Python, JavaScript, TypeScript, Rust, Bash) dans la Sandbox E2B.',
  parameters: {
    type: 'object',
    properties: {
      language: { type: 'string', enum: ['python', 'javascript', 'typescript', 'rust', 'bash'] },
      code: { type: 'string', description: 'Le code source complet à exécuter.' },
    },
    required: ['language', 'code'],
  },
  execute: async (args: Record<string, unknown>) => {
    const language = (args.language as any) || 'javascript';
    const code = (args.code as string) || '';
    return await executeSecureCode({ language, code });
  },
};
