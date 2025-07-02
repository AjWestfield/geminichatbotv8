/**
 * Bridge between Agent Task Store and Workflow Orchestrator
 * Enables autonomous task execution
 */

import { Task, Subtask } from '@/components/ui/agent-plan';
import { WorkflowOrchestrator, WorkflowType } from '@/lib/langgraph/orchestrator';
import { useAgentTaskStore } from '@/lib/stores/agent-task-store';
import { WorkflowEvent } from '@/lib/langgraph/workflow-engine';

// Singleton orchestrator instance
let orchestratorInstance: WorkflowOrchestrator | null = null;

// Active workflow tracking
const activeWorkflows = new Map<string, {
  orchestrator: WorkflowOrchestrator;
  taskIds: Set<string>;
  abortController: AbortController;
}>();

// Event callback to update task store based on workflow events
function handleWorkflowEvent(event: WorkflowEvent) {
  const { updateTaskStatus, updateTask } = useAgentTaskStore.getState();
  
  console.log('[Task Orchestrator Bridge] Workflow event:', event);
  
  switch (event.type) {
    case 'workflow_planning':
      console.log('[Task Orchestrator Bridge] Workflow planning started');
      break;
      
    case 'workflow_executing':
      console.log('[Task Orchestrator Bridge] Workflow executing with', event.data?.totalSteps, 'steps');
      break;
      
    case 'workflow_step_started':
      // Find and update the corresponding task
      const startedTaskId = event.data?.stepId;
      if (startedTaskId) {
        updateTaskStatus(startedTaskId, 'in-progress');
        console.log('[Task Orchestrator Bridge] Task started:', startedTaskId);
      }
      break;
      
    case 'workflow_step_completed':
      // Update task to completed
      const completedTaskId = event.data?.stepId;
      if (completedTaskId) {
        updateTaskStatus(completedTaskId, 'completed');
        console.log('[Task Orchestrator Bridge] Task completed:', completedTaskId);
      }
      break;
      
    case 'workflow_step_failed':
      // Update task to failed
      const failedTaskId = event.data?.stepId;
      if (failedTaskId) {
        updateTaskStatus(failedTaskId, 'failed');
        console.log('[Task Orchestrator Bridge] Task failed:', failedTaskId, event.data?.error);
      }
      break;
      
    case 'workflow_completed':
      console.log('[Task Orchestrator Bridge] Workflow completed successfully');
      break;
      
    case 'workflow_failed':
      console.log('[Task Orchestrator Bridge] Workflow failed:', event.data?.error);
      break;
  }
}

/**
 * Initialize the orchestrator if not already created
 */
function getOrCreateOrchestrator(): WorkflowOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new WorkflowOrchestrator({
      maxConcurrentSteps: 1, // Sequential execution for now
      enableHumanInLoop: false,
      persistenceEnabled: false,
      eventCallback: handleWorkflowEvent
    });
  }
  return orchestratorInstance;
}

/**
 * Convert Task to workflow-compatible format
 */
function convertTaskToWorkflowStep(task: Task) {
  return {
    id: task.id,
    name: task.title,
    description: task.description || task.title,
    agent: determineAgentForTask(task),
    dependencies: task.dependencies,
    status: task.status,
    priority: task.priority,
    metadata: {
      originalTask: task
    }
  };
}

/**
 * Determine which agent should handle a task based on its content
 */
function determineAgentForTask(task: Task): string {
  const title = task.title.toLowerCase();
  const description = (task.description || '').toLowerCase();
  const combined = `${title} ${description}`;
  
  // Simple heuristic - can be improved
  if (combined.includes('search') || combined.includes('find') || combined.includes('look up')) {
    return 'research-agent';
  } else if (combined.includes('analyze') || combined.includes('deep') || combined.includes('comprehensive')) {
    return 'deep-research-agent';
  } else if (combined.includes('code') || combined.includes('implement') || combined.includes('create') || combined.includes('build')) {
    return 'code-agent';
  }
  
  // Default to research agent
  return 'research-agent';
}

/**
 * Execute tasks using the workflow orchestrator
 */
export async function executeTasksWithOrchestrator(tasks: Task[], objective: string) {
  console.log('[Task Orchestrator Bridge] Starting autonomous execution for', tasks.length, 'tasks');
  
  const orchestrator = getOrCreateOrchestrator();
  const workflowId = `workflow-${Date.now()}`;
  const abortController = new AbortController();
  
  // Store workflow info
  activeWorkflows.set(workflowId, {
    orchestrator,
    taskIds: new Set(tasks.map(t => t.id)),
    abortController
  });
  
  try {
    // Convert tasks to workflow steps
    const workflowSteps = tasks.map(convertTaskToWorkflowStep);
    
    // Create workflow state
    const initialState = {
      objective,
      messages: [],
      status: 'planning' as const,
      currentStep: 0,
      results: [],
      metadata: {
        id: workflowId,
        type: 'custom' as WorkflowType,
        startedAt: new Date(),
        config: {
          retryOnFailure: true,
          maxRetries: 2
        }
      },
      plan: {
        totalSteps: workflowSteps.length,
        steps: workflowSteps
      }
    };
    
    // Create and execute workflow
    const workflow = orchestrator.createWorkflow('custom');
    
    // Execute the workflow
    console.log('[Task Orchestrator Bridge] Executing workflow:', workflowId);
    
    // Use streaming execution for real-time updates
    const stream = await workflow.stream(initialState, {
      configurable: {
        thread_id: workflowId
      }
    });
    
    // Process stream events
    for await (const event of stream) {
      // Check if workflow was aborted
      if (abortController.signal.aborted) {
        console.log('[Task Orchestrator Bridge] Workflow aborted:', workflowId);
        break;
      }
      
      console.log('[Task Orchestrator Bridge] Stream event:', event);
    }
    
    console.log('[Task Orchestrator Bridge] Workflow execution completed:', workflowId);
    
  } catch (error) {
    console.error('[Task Orchestrator Bridge] Workflow execution failed:', error);
    
    // Update all tasks to failed state
    const { updateTaskStatus } = useAgentTaskStore.getState();
    tasks.forEach(task => {
      updateTaskStatus(task.id, 'failed');
    });
    
    throw error;
  } finally {
    // Clean up
    activeWorkflows.delete(workflowId);
  }
}

/**
 * Abort a running workflow
 */
export function abortWorkflow(workflowId: string) {
  const workflow = activeWorkflows.get(workflowId);
  if (workflow) {
    workflow.abortController.abort();
    activeWorkflows.delete(workflowId);
    console.log('[Task Orchestrator Bridge] Workflow aborted:', workflowId);
  }
}

/**
 * Check if any workflows are currently running
 */
export function hasActiveWorkflows(): boolean {
  return activeWorkflows.size > 0;
}

/**
 * Get list of active workflow IDs
 */
export function getActiveWorkflowIds(): string[] {
  return Array.from(activeWorkflows.keys());
}
