/**
 * In-Memory Task Store
 * Provides task persistence without requiring an MCP server
 */

import { Task } from '@/components/ui/agent-plan';

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  failed: number;
  needHelp: number;
  progress: number;
}

class InMemoryTaskStore {
  private tasks: Map<string, Task> = new Map();
  private taskOrder: string[] = [];

  /**
   * Add or update tasks
   */
  setTasks(tasks: Task[]): void {
    // Clear existing if setting new task list
    this.tasks.clear();
    this.taskOrder = [];

    tasks.forEach(task => {
      this.tasks.set(task.id, task);
      this.taskOrder.push(task.id);
    });

    console.log(`[InMemoryTaskStore] Stored ${tasks.length} tasks`);
  }

  /**
   * Get all tasks
   */
  getTasks(): Task[] {
    return this.taskOrder
      .map(id => this.tasks.get(id))
      .filter((task): task is Task => task !== undefined);
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Update task status
   */
  updateTaskStatus(taskId: string, status: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
      console.log(`[InMemoryTaskStore] Updated task ${taskId} status to ${status}`);
    }
  }

  /**
   * Get next pending task
   */
  getNextPendingTask(): Task | null {
    for (const taskId of this.taskOrder) {
      const task = this.tasks.get(taskId);
      if (task && task.status === 'pending') {
        // Check dependencies
        const dependenciesComplete = task.dependencies.every(depId => {
          const depTask = this.tasks.get(depId);
          return depTask && depTask.status === 'completed';
        });

        if (dependenciesComplete) {
          return task;
        }
      }
    }
    return null;
  }

  /**
   * Get task statistics
   */
  getStats(): TaskStats {
    const tasks = this.getTasks();
    const stats: TaskStats = {
      total: tasks.length,
      completed: 0,
      inProgress: 0,
      pending: 0,
      failed: 0,
      needHelp: 0,
      progress: 0
    };

    tasks.forEach(task => {
      switch (task.status) {
        case 'completed':
          stats.completed++;
          break;
        case 'in-progress':
        case 'in_progress':
          stats.inProgress++;
          break;
        case 'pending':
          stats.pending++;
          break;
        case 'failed':
          stats.failed++;
          break;
        case 'need-help':
        case 'need_help':
          stats.needHelp++;
          break;
      }
    });

    stats.progress = stats.total > 0 
      ? Math.round((stats.completed / stats.total) * 100)
      : 0;

    return stats;
  }

  /**
   * Clear all tasks
   */
  clearTasks(): void {
    this.tasks.clear();
    this.taskOrder = [];
    console.log('[InMemoryTaskStore] Cleared all tasks');
  }

  /**
   * Check if has tasks
   */
  hasTasks(): boolean {
    return this.tasks.size > 0;
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: string): Task[] {
    return this.getTasks().filter(task => task.status === status);
  }
}

// Singleton instance
export const taskStore = new InMemoryTaskStore();
