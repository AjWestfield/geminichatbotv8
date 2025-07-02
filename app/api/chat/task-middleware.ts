import { parseAgentTaskUpdate } from '@/lib/agent-task-parser';
import { getAutonomousExecutor } from '@/lib/agent-tasks/autonomous-executor';
import { taskStore } from '@/lib/agent-tasks/task-store';
import { Task } from '@/components/ui/agent-plan';
import { useAgentTaskStore } from '@/lib/stores/agent-task-store';

export interface TaskMiddlewareOptions {
  onTaskCreated?: (tasks: Task[]) => void;
  onTaskUpdated?: (taskId: string, status: string) => void;
  onExecutionComplete?: () => void;
  autoExecute?: boolean;
}

export class TaskMiddleware {
  private executor = getAutonomousExecutor();
  private options: TaskMiddlewareOptions;

  constructor(options: TaskMiddlewareOptions = {}) {
    this.options = {
      autoExecute: false, // Default to manual approval
      ...options
    };
  }

  /**
   * Process AI response content for task-related patterns
   */
  async processResponse(content: string, messageId: string): Promise<void> {
    try {
      // Parse task updates from the response
      const taskUpdates = parseAgentTaskUpdate(content);
      
      if (taskUpdates.length === 0) {
        return; // No task-related content
      }

      console.log(`[TaskMiddleware] Found ${taskUpdates.length} task updates in message ${messageId}`);

      for (const update of taskUpdates) {
        switch (update.type) {
          case 'plan':
          case 'create':
            if (update.tasks && update.tasks.length > 0) {
              await this.handleTaskCreation(update.tasks);
            }
            break;
            
          case 'update':
            if (update.taskId && update.status) {
              await this.handleTaskStatusUpdate(update.taskId, update.status);
            }
            break;
            
          case 'status':
            if (update.title && update.status) {
              await this.handleTaskStatusByTitle(update.title, update.status);
            }
            break;
        }
      }
    } catch (error) {
      console.error('[TaskMiddleware] Error processing response:', error);
    }
  }

  /**
   * Handle creation of new tasks
   */
  private async handleTaskCreation(tasks: Task[]): Promise<void> {
    console.log(`[TaskMiddleware] Creating ${tasks.length} tasks`);
    
    try {
      // Store tasks in our in-memory store
      taskStore.setTasks(tasks);
      
      // Update UI store
      const store = useAgentTaskStore.getState();
      store.setTasks(tasks);
      
      // Set planning mode and await approval (unless auto-execute is enabled)
      if (!this.options.autoExecute) {
        store.setPlanningMode(true);
        store.setAwaitingApproval(true);
      }
      
      // Notify callback
      if (this.options.onTaskCreated) {
        this.options.onTaskCreated(tasks);
      }
      
      // Start autonomous execution if auto-execute is enabled
      if (this.options.autoExecute) {
        await this.startAutonomousExecution();
      }
    } catch (error) {
      console.error('[TaskMiddleware] Error creating tasks:', error);
    }
  }

  /**
   * Handle task status update by ID
   */
  private async handleTaskStatusUpdate(taskId: string, status: string): Promise<void> {
    console.log(`[TaskMiddleware] Updating task ${taskId} to status: ${status}`);
    
    try {
      // Update in-memory store
      taskStore.updateTaskStatus(taskId, status);
      
      // Update UI store
      const store = useAgentTaskStore.getState();
      store.updateTaskStatus(taskId, status);
      
      if (this.options.onTaskUpdated) {
        this.options.onTaskUpdated(taskId, status);
      }
    } catch (error) {
      console.error('[TaskMiddleware] Error updating task status:', error);
    }
  }

  /**
   * Handle task status update by title
   */
  private async handleTaskStatusByTitle(title: string, status: string): Promise<void> {
    console.log(`[TaskMiddleware] Updating task by title "${title}" to status: ${status}`);
    
    try {
      // Find task by title in our store
      const tasks = taskStore.getTasks();
      const task = tasks.find(t => 
        t.title.toLowerCase().includes(title.toLowerCase()) ||
        title.toLowerCase().includes(t.title.toLowerCase())
      );
      
      if (task) {
        await this.handleTaskStatusUpdate(task.id, status);
      } else {
        console.warn(`[TaskMiddleware] Could not find task with title: ${title}`);
      }
    } catch (error) {
      console.error('[TaskMiddleware] Error updating task by title:', error);
    }
  }

  /**
   * Start autonomous task execution
   */
  async startAutonomousExecution(): Promise<void> {
    if (this.executor.isRunning()) {
      console.log('[TaskMiddleware] Task executor already running');
      return;
    }

    console.log('[TaskMiddleware] Starting autonomous task execution');
    
    const tasks = taskStore.getTasks();
    if (tasks.length === 0) {
      console.log('[TaskMiddleware] No tasks to execute');
      return;
    }

    // Update UI to show execution mode
    const store = useAgentTaskStore.getState();
    store.setPlanningMode(false);
    store.setAwaitingApproval(false);

    // Start execution
    await this.executor.executeTasks(tasks, {
      onProgress: (taskId, status, message) => {
        console.log(`[TaskMiddleware] Task ${taskId}: ${status} - ${message}`);
        
        // Update stores
        taskStore.updateTaskStatus(taskId, status);
        store.updateTaskStatus(taskId, status);
        
        if (this.options.onTaskUpdated) {
          this.options.onTaskUpdated(taskId, status);
        }
      },
      onComplete: () => {
        console.log('[TaskMiddleware] All tasks completed');
        
        const stats = taskStore.getStats();
        console.log('[TaskMiddleware] Final stats:', stats);
        
        if (this.options.onExecutionComplete) {
          this.options.onExecutionComplete();
        }
      },
      onError: (error) => {
        console.error('[TaskMiddleware] Execution error:', error);
      },
      autoExecute: true
    });
  }

  /**
   * Manually trigger task execution (e.g., after user approval)
   */
  async executeApprovedTasks(): Promise<void> {
    console.log('[TaskMiddleware] Executing approved tasks');
    await this.startAutonomousExecution();
  }

  /**
   * Stop task execution
   */
  stopExecution(): void {
    console.log('[TaskMiddleware] Stopping task execution');
    this.executor.stop();
  }

  /**
   * Check if executor is running
   */
  isExecuting(): boolean {
    return this.executor.isRunning();
  }

  /**
   * Get current execution status
   */
  getExecutionStatus(): { isExecuting: boolean; currentTaskId: string | null; stats: any } {
    return {
      isExecuting: this.executor.isRunning(),
      currentTaskId: this.executor.getCurrentTaskId(),
      stats: taskStore.getStats()
    };
  }
}

// Singleton instance for easy access
let middleware: TaskMiddleware | null = null;

export function getTaskMiddleware(options?: TaskMiddlewareOptions): TaskMiddleware {
  if (!middleware) {
    middleware = new TaskMiddleware(options);
  }
  return middleware;
}
