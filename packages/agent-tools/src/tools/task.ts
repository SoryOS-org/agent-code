/**
 * Task Management Tool
 * Allows agents to create, update, or resolve tasks in the TaskManager.
 */

import { TaskManager } from '@packages/task-manager/src/index.ts';

const globalTaskManager = new TaskManager();

export const taskTool = {
  name: 'task',
  description: 'Créer, mettre à jour ou suivre une sous-tâche d\'agent dans la liste de contrôle OpenCode.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['add', 'update', 'list'] },
      title: { type: 'string', description: 'Le titre de la tâche.' },
      status: { type: 'string', enum: ['todo', 'in_progress', 'completed', 'failed'] },
      taskId: { type: 'string', description: 'L\'ID de la tâche à mettre à jour.' },
    },
    required: ['action'],
  },
  execute: async (args: Record<string, unknown>) => {
    const action = (args.action as string) || 'list';
    if (action === 'add') {
      const title = (args.title as string) || 'Nouvelle tâche';
      const task = globalTaskManager.addTask(title);
      return { success: true, task };
    } else if (action === 'update' && args.taskId) {
      const taskId = args.taskId as string;
      const status = (args.status as any) || 'completed';
      const updated = globalTaskManager.updateTaskStatus(taskId, status);
      return { success: Boolean(updated), task: updated };
    }

    return { tasks: globalTaskManager.getAllTasks() };
  },
};
