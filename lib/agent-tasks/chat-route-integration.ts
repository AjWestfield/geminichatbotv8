/**
 * Integration patch for autonomous task execution in chat route
 * Add this after the fullResponse is collected (around line 1030)
 */

// Import at the top of the file:
import { getTaskMiddleware } from './task-middleware'
import { getAutonomousExecutor } from '@/lib/agent-tasks/autonomous-executor'

// Add after line 1030 (after tool execution but before metadata injection):

// Process the response for task-related content
try {
  const taskMiddleware = getTaskMiddleware({
    autoExecute: false, // Require user approval
    onTaskCreated: (tasks) => {
      console.log(`[Chat API] Created ${tasks.length} tasks from AI response`)
      
      // Inject task creation notification
      const taskNotification = {
        type: 'task_creation',
        tasks: tasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status
        }))
      }
      safeEnqueue(controller, encoder, `0:${JSON.stringify(`[TASKS_CREATED]${JSON.stringify(taskNotification)}[/TASKS_CREATED]`)}\n`, 'task creation')
    },
    onTaskUpdated: (taskId, status) => {
      console.log(`[Chat API] Task ${taskId} updated to ${status}`)
      
      // Inject task update notification
      const updateNotification = {
        type: 'task_update',
        taskId,
        status
      }
      safeEnqueue(controller, encoder, `0:${JSON.stringify(`[TASK_UPDATED]${JSON.stringify(updateNotification)}[/TASK_UPDATED]`)}\n`, 'task update')
    }
  })
  
  // Process the full response for tasks
  await taskMiddleware.processResponse(fullResponse, messageId || 'chat-message')
  
  // Check if this is an approval message
  if (messageContent.toLowerCase().includes('approve') || 
      messageContent.toLowerCase().includes('execute') ||
      messageContent.toLowerCase().includes('yes, execute')) {
    
    // Check if we have pending tasks awaiting approval
    const store = useAgentTaskStore.getState()
    if (store.awaitingApproval && store.tasks.length > 0) {
      console.log('[Chat API] User approved task execution')
      
      // Execute the tasks
      await taskMiddleware.executeApprovedTasks()
      
      // Send execution started notification
      safeEnqueue(controller, encoder, `0:${JSON.stringify(`Starting autonomous execution of ${store.tasks.length} tasks...`)}\n`, 'execution start')
    }
  }
  
} catch (error) {
  console.error('[Chat API] Task processing error:', error)
}
