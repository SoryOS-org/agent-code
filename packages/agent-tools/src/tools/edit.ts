/**
 * Edit File Tool
 * Edits specific lines or replaces target content in a file.
 */

import { runE2BCommand, writeE2BFile } from '@packages/opencode-e2b/src/e2b-agent-tools.ts';

export const editTool = {
  name: 'edit',
  description: 'Remplacer une portion de texte spécifique ou éditer un fichier dans la Sandbox E2B.',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Le chemin du fichier à modifier.' },
      targetContent: { type: 'string', description: 'Le texte exact à remplacer.' },
      replacementContent: { type: 'string', description: 'Le nouveau texte de remplacement.' },
    },
    required: ['path', 'targetContent', 'replacementContent'],
  },
  execute: async (args: Record<string, unknown>) => {
    const path = (args.path as string) || '';
    const targetContent = (args.targetContent as string) || '';
    const replacementContent = (args.replacementContent as string) || '';

    // Read current content from sandbox
    const readRes = await runE2BCommand(`cat ${JSON.stringify(path)}`);
    if (readRes.exitCode !== 0) {
      return { success: false, error: `Impossible de lire le fichier ${path} : ${readRes.stderr}` };
    }

    const currentText = readRes.stdout || '';
    if (!currentText.includes(targetContent)) {
      return { success: false, error: `Le texte cible n'a pas été trouvé dans le fichier ${path}.` };
    }

    const updatedText = currentText.replace(targetContent, replacementContent);
    const writeRes = await writeE2BFile(path, updatedText);

    return {
      success: writeRes.success,
      path,
      message: writeRes.message,
    };
  },
};
