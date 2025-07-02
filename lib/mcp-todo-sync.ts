import { useAgentTaskStore } from '@/lib/stores/agent-task-store'
import type { Task } from '@/components/ui/agent-plan'

/**
 * MCP Todo Sync Service
 * Handles synchronization between the UI task store and the MCP todo server via API routes
 */

interface TodoTask {
  id: string
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'need-help'
  priority: 'low' | 'medium' | 'high'
  createdAt?: string
  updatedAt?: string
  dependencies?: string[]
}

interface TodoStats {
  total: number
  completed: number
  inProgress: number
  pending: number
  failed: number
  needHelp: number
  progress: number
}

// API endpoint for MCP todo operations
const TODO_API_ENDPOINT = '/api/mcp/todo'

// Make API request to MCP todo server
async function mcpApiRequest(action: string, data?: any): Promise<any> {
  try {
    const response = await fetch(TODO_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, data }),
    })

    const result = await response.json()
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'MCP API request failed')
    }

    return result.data
  } catch (error) {
    console.error(`[MCPTodoSync] API request failed for ${action}:`, error)
    throw error
  }
}

// Sync tasks from UI to MCP server
export async function syncTasksToMCP(tasks: Task[]): Promise<void> {
  try {
    // Convert UI tasks to MCP format
    const mcpTasks: TodoTask[] = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || '',
      status: mapStatusToMCP(task.status),
      priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
      dependencies: task.dependencies || []
    }))

    // Send to MCP server
    await mcpApiRequest('write', { tasks: mcpTasks })
    console.log('[MCPTodoSync] Synced', tasks.length, 'tasks to MCP server')
  } catch (error) {
    console.error('[MCPTodoSync] Failed to sync tasks to MCP:', error)
  }
}

// Sync tasks from MCP server to UI
export async function syncTasksFromMCP(): Promise<void> {
  try {
    const result = await mcpApiRequest('read')
    const mcpTasks: TodoTask[] = result.tasks || []

    // Convert MCP tasks to UI format
    const uiTasks: Task[] = mcpTasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: mapStatusFromMCP(task.status),
      priority: task.priority,
      level: 0,
      dependencies: task.dependencies || [],
      subtasks: []
    }))

    // Update UI store
    const store = useAgentTaskStore.getState()
    store.setTasks(uiTasks)
    
    console.log('[MCPTodoSync] Synced', uiTasks.length, 'tasks from MCP server')
  } catch (error) {
    console.error('[MCPTodoSync] Failed to sync tasks from MCP:', error)
  }
}

// Update task status in MCP server
export async function updateTaskStatusInMCP(taskId: string, status: string): Promise<void> {
  try {
    const mcpStatus = mapStatusToMCP(status)
    await mcpApiRequest('update_status', { taskId, status: mcpStatus })
    console.log('[MCPTodoSync] Updated task', taskId, 'status to', mcpStatus)
  } catch (error) {
    console.error('[MCPTodoSync] Failed to update task status:', error)
  }
}

// Get next task from MCP server
export async function getNextTaskFromMCP(): Promise<TodoTask | null> {
  try {
    const result = await mcpApiRequest('get_next')
    return result.hasNext ? result.task : null
  } catch (error) {
    console.error('[MCPTodoSync] Failed to get next task:', error)
    return null
  }
}

// Get task statistics from MCP server
export async function getTaskStatsFromMCP(): Promise<TodoStats | null> {
  try {
    const stats = await mcpApiRequest('stats')
    return stats
  } catch (error) {
    console.error('[MCPTodoSync] Failed to get task stats:', error)
    return null
  }
}

// Clear all tasks in MCP server
export async function clearTasksInMCP(): Promise<void> {
  try {
    await mcpApiRequest('clear')
    console.log('[MCPTodoSync] Cleared all tasks in MCP server')
  } catch (error) {
    console.error('[MCPTodoSync] Failed to clear tasks:', error)
  }
}

// Status mapping functions
function mapStatusToMCP(uiStatus: string): TodoTask['status'] {
  const statusMap: Record<string, TodoTask['status']> = {
    'pending': 'pending',
    'in_progress': 'in-progress',
    'in-progress': 'in-progress',
    'completed': 'completed',
    'failed': 'failed',
    'need_help': 'need-help',
    'need-help': 'need-help'
  }
  return statusMap[uiStatus] || 'pending'
}

function mapStatusFromMCP(mcpStatus: TodoTask['status']): string {
  const statusMap: Record<TodoTask['status'], string> = {
    'pending': 'pending',
    'in-progress': 'in_progress',
    'completed': 'completed',
    'failed': 'failed',
    'need-help': 'need_help'
  }
  return statusMap[mcpStatus] || 'pending'
}

// Auto-sync when tasks are added via TodoWrite tool
export function setupAutoSync() {
  // Monitor for TodoWrite tool executions
  if (typeof window !== 'undefined') {
    // Set up periodic sync
    setInterval(() => {
      syncTasksFromMCP().catch(console.error)
    }, 5000) // Sync every 5 seconds
  }
}

// Initialize sync on module load
if (typeof window !== 'undefined') {
  setupAutoSync()
}