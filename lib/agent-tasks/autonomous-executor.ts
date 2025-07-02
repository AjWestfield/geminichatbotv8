/**
 * Autonomous Task Executor
 * Connects the orchestrator to enable automatic task execution
 */

import { Task } from '@/components/ui/agent-plan';
import { useAgentTaskStore } from '@/lib/stores/agent-task-store';
import { WorkflowOrchestrator } from '@/lib/langgraph/orchestrator';

export interface ExecutionOptions {
  onProgress?: (taskId: string, status: string, message?: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  autoExecute?: boolean;
}

export class AutonomousTaskExecutor {
  private orchestrator: WorkflowOrchestrator;
  private isExecuting = false;
  private currentTaskId: string | null = null;
  private abortController: AbortController | null = null;

  constructor() {
    this.orchestrator = new WorkflowOrchestrator({
      maxConcurrentSteps: 1, // Sequential execution for now
      enableHumanInLoop: false,
      eventCallback: this.handleWorkflowEvent.bind(this)
    });
  }

  /**
   * Start autonomous execution of tasks
   */
  async executeTasks(tasks: Task[], options: ExecutionOptions = {}): Promise<void> {
    if (this.isExecuting) {
      console.warn('[AutonomousExecutor] Already executing tasks');
      return;
    }

    this.isExecuting = true;
    this.abortController = new AbortController();

    console.log(`[AutonomousExecutor] Starting execution of ${tasks.length} tasks`);

    try {
      // Update UI to show execution started
      const store = useAgentTaskStore.getState();
      
      for (const task of tasks) {
        if (this.abortController.signal.aborted) {
          console.log('[AutonomousExecutor] Execution aborted');
          break;
        }

        this.currentTaskId = task.id;
        
        // Update task status to in-progress
        store.updateTaskStatus(task.id, 'in-progress');
        options.onProgress?.(task.id, 'in-progress', `Executing: ${task.title}`);

        try {
          // Execute the task
          await this.executeTask(task);
          
          // Update task status to completed
          store.updateTaskStatus(task.id, 'completed');
          options.onProgress?.(task.id, 'completed', `Completed: ${task.title}`);

        } catch (error) {
          console.error(`[AutonomousExecutor] Task ${task.id} failed:`, error);
          
          // Update task status to failed
          store.updateTaskStatus(task.id, 'failed');
          options.onProgress?.(task.id, 'failed', `Failed: ${error}`);
          
          // Optionally continue or stop on error
          if (!options.autoExecute) {
            throw error;
          }
        }

        // Small delay between tasks for better UX
        await this.delay(500);
      }

      console.log('[AutonomousExecutor] All tasks completed');
      options.onComplete?.();

    } catch (error) {
      console.error('[AutonomousExecutor] Execution failed:', error);
      options.onError?.(error as Error);
    } finally {
      this.isExecuting = false;
      this.currentTaskId = null;
      this.abortController = null;
    }
  }

  /**
   * Execute a single task by calling the appropriate tool
   */
  private async executeTask(task: Task): Promise<void> {
    console.log(`[AutonomousExecutor] Executing task: ${task.title}`);

    // Determine task type and execute accordingly
    const taskLower = task.title.toLowerCase();

    if (taskLower.includes('search') || taskLower.includes('find')) {
      await this.executeWebSearch(task);
    } else if (taskLower.includes('generate') && taskLower.includes('image')) {
      await this.executeImageGeneration(task);
    } else if (taskLower.includes('animate') || taskLower.includes('video')) {
      await this.executeVideoGeneration(task);
    } else if (taskLower.includes('create') || taskLower.includes('write')) {
      await this.executeCodeGeneration(task);
    } else {
      // Generic task execution via chat
      await this.executeGenericTask(task);
    }
  }

  /**
   * Execute web search task
   */
  private async executeWebSearch(task: Task): Promise<void> {
    console.log('[AutonomousExecutor] Executing web search task');
    
    // Extract search query from task
    const searchQuery = this.extractSearchQuery(task.title, task.description);
    
    // Use Perplexity client directly since there's no web-search API endpoint
    const { PerplexityClient } = await import('@/lib/perplexity-client');
    const perplexityClient = new PerplexityClient();
    
    try {
      const results = await perplexityClient.search({
        query: searchQuery,
        search_recency_filter: 'month',
        return_images: true,
        return_related_questions: true
      });
      
      console.log('[AutonomousExecutor] Web search completed:', {
        resultsCount: results.search_results?.length || 0,
        hasImages: !!results.images?.length
      });
      
      // Store results for future tasks to reference
      // In a real implementation, we'd pass these to subsequent tasks
    } catch (error) {
      console.error('[AutonomousExecutor] Web search failed:', error);
      throw error;
    }
  }

  /**
   * Execute image generation task
   */
  private async executeImageGeneration(task: Task): Promise<void> {
    console.log('[AutonomousExecutor] Executing image generation task');
    
    // Extract prompt from task
    const prompt = this.extractImagePrompt(task.title, task.description);
    
    // Call image generation API
    const response = await fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt,
        model: 'replicate',
        width: 1024,
        height: 1024
      })
    });

    if (!response.ok) {
      throw new Error('Image generation failed');
    }

    const result = await response.json();
    console.log('[AutonomousExecutor] Image generated:', result.url);
  }

  /**
   * Execute video generation task
   */
  private async executeVideoGeneration(task: Task): Promise<void> {
    console.log('[AutonomousExecutor] Executing video generation task');
    
    // Extract prompt from task
    const prompt = this.extractVideoPrompt(task.title, task.description);
    
    // Call video generation API
    const response = await fetch('/api/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt,
        duration: 5
      })
    });

    if (!response.ok) {
      throw new Error('Video generation failed');
    }

    const result = await response.json();
    console.log('[AutonomousExecutor] Video generated:', result.url);
  }

  /**
   * Execute code generation task
   */
  private async executeCodeGeneration(task: Task): Promise<void> {
    console.log('[AutonomousExecutor] Executing code generation task');
    
    // Use the code agent from orchestrator
    const codeAgent = this.orchestrator.getAgent('code-agent');
    if (codeAgent) {
      const result = await codeAgent.execute({
        task: task.title,
        context: { 
          objective: task.description,
          previousSteps: [],
          metadata: { id: task.id, type: 'code' }
        },
        previousResults: []
      });
      
      console.log('[AutonomousExecutor] Code generated:', result);
    }
  }

  /**
   * Execute generic task via chat API
   */
  private async executeGenericTask(task: Task): Promise<void> {
    console.log('[AutonomousExecutor] Executing generic task via chat');
    
    // Use chat API to process the task
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: `Execute this task: ${task.title}. ${task.description || ''}`
        }],
        model: 'gemini-2.0-flash-exp'
      })
    });

    if (!response.ok) {
      throw new Error('Chat API failed');
    }

    // Stream the response
    const reader = response.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        // Process streaming response
      }
    }
  }

  /**
   * Handle workflow events
   */
  private handleWorkflowEvent(event: any): void {
    console.log('[AutonomousExecutor] Workflow event:', event);
    
    // Update UI based on workflow events
    const store = useAgentTaskStore.getState();
    
    switch (event.type) {
      case 'workflow_step_started':
        if (event.data?.stepId) {
          store.updateTaskStatus(event.data.stepId, 'in-progress');
        }
        break;
        
      case 'workflow_step_completed':
        if (event.data?.stepId) {
          store.updateTaskStatus(event.data.stepId, 'completed');
        }
        break;
        
      case 'workflow_step_failed':
        if (event.data?.stepId) {
          store.updateTaskStatus(event.data.stepId, 'failed');
        }
        break;
    }
  }

  /**
   * Extract search query from task
   */
  private extractSearchQuery(title: string, description: string): string {
    // Simple extraction - in production would use NLP
    const text = `${title} ${description}`.toLowerCase();
    const searchMatch = text.match(/search\s+(?:for\s+)?["']?([^"']+)["']?/i);
    return searchMatch?.[1] || title;
  }

  /**
   * Extract image prompt from task
   */
  private extractImagePrompt(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();
    const generateMatch = text.match(/generate\s+(?:an?\s+)?(?:image\s+of\s+)?["']?([^"']+)["']?/i);
    return generateMatch?.[1] || title;
  }

  /**
   * Extract video prompt from task
   */
  private extractVideoPrompt(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();
    const animateMatch = text.match(/(?:animate|create\s+video\s+of)\s+["']?([^"']+)["']?/i);
    return animateMatch?.[1] || title;
  }

  /**
   * Stop execution
   */
  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isExecuting = false;
  }

  /**
   * Check if executor is running
   */
  isRunning(): boolean {
    return this.isExecuting;
  }

  /**
   * Get current task ID
   */
  getCurrentTaskId(): string | null {
    return this.currentTaskId;
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let executor: AutonomousTaskExecutor | null = null;

export function getAutonomousExecutor(): AutonomousTaskExecutor {
  if (!executor) {
    executor = new AutonomousTaskExecutor();
  }
  return executor;
}
