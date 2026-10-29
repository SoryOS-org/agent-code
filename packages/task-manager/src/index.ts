/**
 * @packages/task-manager
 * OpenCode-style agent task orchestration, task state machine, and step tracking
 */

export interface AgentTask {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed' | 'failed';
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  output?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export class TaskManager {
  private tasks = new Map<string, AgentTask>();

  addTask(title: string, toolName?: string, toolArgs?: Record<string, unknown>): AgentTask {
    const task: AgentTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      status: 'todo',
      toolName,
      toolArgs,
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  updateTaskStatus(
    id: string,
    status: 'in_progress' | 'completed' | 'failed',
    output?: string,
    error?: string
  ): AgentTask | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    task.status = status;
    if (output !== undefined) task.output = output;
    if (error !== undefined) task.error = error;
    if (status === 'completed' || status === 'failed') {
      task.completedAt = new Date().toISOString();
    }

    return task;
  }

  getTask(id: string): AgentTask | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): AgentTask[] {
    return Array.from(this.tasks.values());
  }

  clear(): void {
    this.tasks.clear();
  }
}
