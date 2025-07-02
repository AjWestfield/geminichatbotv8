/**
 * Simple Autonomous Task Executor
 * Executes tasks using the real autonomous executor
 */

import { Task } from '@/components/ui/agent-plan';
import { useAgentTaskStore } from '@/lib/stores/agent-task-store';
import { Message } from 'ai';
import { getAutonomousExecutor } from '@/lib/agent-tasks/autonomous-executor';

// Task execution state
interface ExecutionState {
  currentTaskIndex: number;
  isExecuting: boolean;
  abortController: AbortController | null;
}

const executionState: ExecutionState = {
  currentTaskIndex: 0,
  isExecuting: false,
  abortController: null
};

/**
 * Execute tasks autonomously using the real task executor
 */
export async function executeTasksAutonomously(
  tasks: Task[],
  appendMessage: (message: Message | any) => Promise<void>,
  setInput: (event: React.ChangeEvent<HTMLInputElement>) => void
) {
  if (executionState.isExecuting) {
    console.log('[Autonomous Executor] Already executing tasks');
    return;
  }
  
  console.log('[Autonomous Executor] Starting execution of', tasks.length, 'tasks');
  
  executionState.isExecuting = true;
  executionState.currentTaskIndex = 0;
  executionState.abortController = new AbortController();
  
  const executor = getAutonomousExecutor();
  
  try {
    // Send initial message
    await appendMessage({
      role: 'assistant',
      content: `Starting autonomous execution of ${tasks.length} tasks...`,
      metadata: {
        isAutonomousExecution: true,
        taskCount: tasks.length
      }
    });
    
    // Execute tasks using the autonomous executor
    await executor.executeTasks(tasks, {
      onProgress: async (taskId, status, message) => {
        console.log(`[Autonomous Executor] Task ${taskId}: ${status} - ${message}`);
        
        // Update the UI with progress
        if (status === 'in-progress') {
          await appendMessage({
            role: 'assistant', 
            content: `🔄 ${message}`,
            metadata: {
              isAutonomousExecution: true,
              taskId,
              status
            }
          });
        } else if (status === 'completed') {
          await appendMessage({
            role: 'assistant',
            content: `✅ ${message}`,
            metadata: {
              isAutonomousExecution: true,
              taskId,
              status
            }
          });
        } else if (status === 'failed') {
          await appendMessage({
            role: 'assistant',
            content: `❌ ${message}`,
            metadata: {
              isAutonomousExecution: true,
              taskId,
              status
            }
          });
        }
      },
      onComplete: async () => {
        console.log('[Autonomous Executor] All tasks completed');
        
        // Send completion message
        await appendMessage({
          role: 'assistant',
          content: `🎉 All ${tasks.length} tasks have been completed successfully!`,
          metadata: {
            isAutonomousExecution: true,
            isComplete: true
          }
        });
      },
      onError: async (error) => {
        console.error('[Autonomous Executor] Execution error:', error);
        
        await appendMessage({
          role: 'assistant',
          content: `⚠️ Task execution encountered an error: ${error.message}`,
          metadata: {
            isAutonomousExecution: true,
            isError: true,
            error: error.message
          }
        });
      },
      autoExecute: true
    });
    
  } catch (error) {
    console.error('[Autonomous Executor] Execution failed:', error);
  } finally {
    executionState.isExecuting = false;
    executionState.abortController = null;
  }
}

/**
 * Abort the current execution
 */
export function abortAutonomousExecution() {
  const executor = getAutonomousExecutor();
  executor.stop();
  
  if (executionState.abortController) {
    executionState.abortController.abort();
    console.log('[Autonomous Executor] Execution aborted by user');
  }
}

/**
 * Check if autonomous execution is currently running
 */
export function isExecutingAutonomously(): boolean {
  const executor = getAutonomousExecutor();
  return executor.isRunning() || executionState.isExecuting;
}

/**
 * Get current execution progress
 */
export function getExecutionProgress(): {
  currentTask: number;
  totalTasks: number;
  isExecuting: boolean;
} {
  const { tasks } = useAgentTaskStore.getState();
  const executor = getAutonomousExecutor();
  
  return {
    currentTask: executionState.currentTaskIndex + 1,
    totalTasks: tasks.length,
    isExecuting: executor.isRunning()
  };
}

// Legacy functions kept for compatibility
export async function waitForTaskCompletion(taskId: string, timeout = 120000): Promise<void> {
  // This is now handled by the autonomous executor
  return Promise.resolve();
}

export function generateTaskExecutionPrompt(task: Task, previousResults: string[] = []): string {
  let prompt = `Execute this task: ${task.title}`;
  
  if (task.description) {
    prompt += `\n\nDescription: ${task.description}`;
  }
  
  if (previousResults.length > 0) {
    prompt += `\n\nPrevious task results:\n${previousResults.map((r, i) => `Task ${i + 1}: ${r}`).join('\n')}`;
  }
  
  return prompt;
}
