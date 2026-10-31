/**
 * Edit File Tool
 * Edits specific lines or replaces target content in a file.
 */

import { runE2BCommand, writeE2BFile } from '@packages/e2b/src/e2b-agent-tools.ts';

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
    const filePath = (args.path as string);
    const targetContent = (args.targetContent as string) || '';
    const replacementContent = (args.replacementContent as string) || '';

    if (!filePath) {
      return { success: false, message: 'Le chemin du fichier est requis.' };
    }

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const workspaceRoot = path.join(process.cwd(), 'workspace');
      const localPath = path.join(workspaceRoot, filePath);

      // Security
      if (!localPath.startsWith(workspaceRoot)) {
        return { success: false, message: 'Accès hors workspace non autorisé.' };
      }

      let currentText = '';
      try {
        currentText = await fs.readFile(localPath, 'utf-8');
      } catch (readErr) {
        // Fallback to E2B for reading
        const res = await runE2BCommand(`cat ${JSON.stringify(filePath)}`);
        if (res.exitCode === 0) {
          currentText = res.stdout || '';
        } else {
          throw readErr;
        }
      }

      if (!currentText.includes(targetContent)) {
        return { success: false, error: `Le texte cible n'a pas été trouvé dans le fichier ${filePath}.` };
      }

      const updatedText = currentText.replace(targetContent, replacementContent);
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, updatedText, 'utf-8');

      // Sync to E2B
      try {
        await writeE2BFile(filePath, updatedText);
      } catch (e2bErr) {
        console.warn('Failed to sync edit to E2B:', e2bErr);
      }

      return {
        success: true,
        path: filePath,
        message: `Fichier "${filePath}" mis à jour avec succès.`,
      };
    } catch (err: any) {
      return {
        success: false,
        path: filePath,
        message: `Erreur d'édition : ${err.message}`,
      };
    }
  },
};
