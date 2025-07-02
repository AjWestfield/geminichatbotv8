import { 
  getNextTaskFromMCP, 
  updateTaskStatusInMCP,
  getTaskStatsFromMCP 
} from './mcp-todo-sync'

/**
 * Task Executor Service
 * Handles autonomous execution of tasks from the MCP todo server
 */

export interface ExecutionContext {
  abortSignal?: AbortSignal
  onProgress?: (taskId: string, status: string, message?: string) => void
  onComplete?: (stats: any) => void
  onError?: (error: Error) => void
}

export class TaskExecutor {
  private isExecuting: boolean = false
  private currentTaskId: string | null = null
  private executionContext: ExecutionContext | null = null

  /**
   * Start autonomous task execution
   */
  async startExecution(context: ExecutionContext = {}): Promise<void> {
    if (this.isExecuting) {
      console.warn('[TaskExecutor] Already executing tasks')
      return
    }

    this.isExecuting = true
    this.executionContext = context

    console.log('[TaskExecutor] Starting autonomous task execution')

    try {
      await this.executionLoop()
    } catch (error) {
      console.error('[TaskExecutor] Execution failed:', error)
      context.onError?.(error as Error)
    } finally {
      this.isExecuting = false
      this.currentTaskId = null
      this.executionContext = null
    }
  }

  /**
   * Stop task execution
   */
  stopExecution(): void {
    console.log('[TaskExecutor] Stopping execution')
    this.isExecuting = false
  }

  /**
   * Main execution loop
   */
  private async executionLoop(): Promise<void> {
    while (this.isExecuting) {
      // Check for abort signal
      if (this.executionContext?.abortSignal?.aborted) {
        console.log('[TaskExecutor] Execution aborted')
        break
      }

      // Get next task
      const nextTask = await getNextTaskFromMCP()
      
      if (!nextTask) {
        console.log('[TaskExecutor] No more pending tasks')
        break
      }

      this.currentTaskId = nextTask.id
      console.log(`[TaskExecutor] Executing task: ${nextTask.title}`)

      try {
        // Update status to in-progress
        await updateTaskStatusInMCP(nextTask.id, 'in-progress')
        this.executionContext?.onProgress?.(nextTask.id, 'in-progress', `Starting: ${nextTask.title}`)

        // Execute the task
        await this.executeTask(nextTask)

        // Update status to completed
        await updateTaskStatusInMCP(nextTask.id, 'completed')
        this.executionContext?.onProgress?.(nextTask.id, 'completed', `Completed: ${nextTask.title}`)

      } catch (error) {
        console.error(`[TaskExecutor] Task ${nextTask.id} failed:`, error)
        
        // Update status to failed
        await updateTaskStatusInMCP(nextTask.id, 'failed')
        this.executionContext?.onProgress?.(nextTask.id, 'failed', `Failed: ${error}`)
      }

      // Small delay between tasks
      await this.delay(1000)
    }

    // Get final statistics
    const stats = await getTaskStatsFromMCP()
    if (stats) {
      console.log('[TaskExecutor] Execution complete:', stats)
      this.executionContext?.onComplete?.(stats)
    }
  }

  /**
   * Execute a specific task
   */
  private async executeTask(task: any): Promise<void> {
    console.log(`[TaskExecutor] Executing task ${task.id}: ${task.title}`)

    // Simulate task execution based on task type
    // In a real implementation, this would call the appropriate tool
    
    if (task.title.toLowerCase().includes('search')) {
      // Simulate web search
      console.log('[TaskExecutor] Simulating web search...')
      await this.delay(2000)
    } else if (task.title.toLowerCase().includes('image')) {
      // Simulate image generation
      console.log('[TaskExecutor] Simulating image generation...')
      await this.delay(3000)
    } else if (task.title.toLowerCase().includes('animate') || task.title.toLowerCase().includes('video')) {
      // Simulate video generation
      console.log('[TaskExecutor] Simulating video generation...')
      await this.delay(4000)
    } else {
      // Generic task execution
      console.log('[TaskExecutor] Executing generic task...')
      await this.delay(2000)
    }

    // In a real implementation, this would:
    // 1. Parse the task requirements
    // 2. Call the appropriate tool (web search, image gen, etc.)
    // 3. Store the results
    // 4. Handle any errors
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get current execution status
   */
  getStatus(): { isExecuting: boolean; currentTaskId: string | null } {
    return {
      isExecuting: this.isExecuting,
      currentTaskId: this.currentTaskId
    }
  }
}

// Singleton instance
export const taskExecutor = new TaskExecutor()

// Helper function to start execution
export async function startAutonomousExecution(
  onProgress?: (taskId: string, status: string, message?: string) => void,
  onComplete?: (stats: any) => void
): Promise<void> {
  const abortController = new AbortController()
  
  await taskExecutor.startExecution({
    abortSignal: abortController.signal,
    onProgress,
    onComplete,
    onError: (error) => {
      console.error('[TaskExecutor] Execution error:', error)
    }
  })
  
  return abortController.abort.bind(abortController)
}