/**
 * MCP-Task Sync Bridge
 * 
 * This module provides real-time synchronization between MCP TodoManager operations
 * and the Agent Task Display UI component. It bridges the gap between actual
 * MCP tool execution and the visual task tracking interface.
 */

import { useAgentTaskStore } from '@/lib/stores/agent-task-store';
import { Task } from '@/components/ui/agent-plan';

export interface MCPToolResult {
  server: string;
  tool: string;
  arguments: any;
  result: any;
  success: boolean;
}

export interface TodoManagerOperation {
  type: 'todo_write' | 'todo_update_status' | 'todo_read';
  todos?: any[];
  taskId?: string;
  status?: string;
  result?: any;
}

/**
 * Detects if an MCP tool call is a TodoManager operation
 */
export function isTodoManagerOperation(toolResult: MCPToolResult): boolean {
  return toolResult.server.toLowerCase().includes('todo') && 
         ['todo_write', 'todo_update_status', 'todo_read'].includes(toolResult.tool);
}

/**
 * Parses MCP TodoManager tool results into operation data
 */
export function parseTodoManagerResult(toolResult: MCPToolResult): TodoManagerOperation | null {
  if (!isTodoManagerOperation(toolResult)) {
    return null;
  }

  const operation: TodoManagerOperation = {
    type: toolResult.tool as any,
    result: toolResult.result
  };

  // Parse based on tool type
  switch (toolResult.tool) {
    case 'todo_write':
      // Extract todos from arguments or result
      if (toolResult.arguments?.todos) {
        operation.todos = Array.isArray(toolResult.arguments.todos) 
          ? toolResult.arguments.todos 
          : [toolResult.arguments.todos];
      } else if (typeof toolResult.result === 'string') {
        // Try to extract todos from success message
        const todosFromResult = extractTodosFromResult(toolResult.result);
        if (todosFromResult.length > 0) {
          operation.todos = todosFromResult;
        }
      }
      break;

    case 'todo_update_status':
      // Extract task ID and status from arguments
      operation.taskId = toolResult.arguments?.id || toolResult.arguments?.taskId;
      operation.status = toolResult.arguments?.status;
      break;

    case 'todo_read':
      // Extract todos from result
      if (toolResult.result && typeof toolResult.result === 'object') {
        operation.todos = Array.isArray(toolResult.result) 
          ? toolResult.result 
          : toolResult.result.todos || [];
      }
      break;
  }

  return operation;
}

/**
 * Extracts todo items from MCP tool result strings
 */
function extractTodosFromResult(resultString: string): any[] {
  const todos: any[] = [];
  
  // Look for todo creation patterns in result
  const todoPatterns = [
    /Created todo:\s*([^\n]+)/gi,
    /Added task:\s*([^\n]+)/gi,
    /Task created:\s*([^\n]+)/gi,
    /Todo:\s*([^\n]+)/gi
  ];

  for (const pattern of todoPatterns) {
    const matches = Array.from(resultString.matchAll(pattern));
    matches.forEach((match, index) => {
      if (match[1]) {
        todos.push({
          id: `mcp-task-${Date.now()}-${index}`,
          content: match[1].trim(),
          status: 'pending',
          priority: index === 0 ? 'high' : 'medium'
        });
      }
    });
  }

  return todos;
}

/**
 * Converts MCP todo objects to Agent Task format
 */
export function convertMCPTodosToTasks(mcpTodos: any[]): Task[] {
  return mcpTodos.map((todo, index) => ({
    id: todo.id || `mcp-task-${index + 1}`,
    title: todo.content || todo.title || todo.description || `Task ${index + 1}`,
    description: todo.description || '',
    status: mapMCPStatusToTaskStatus(todo.status || 'pending'),
    priority: todo.priority || (index === 0 ? 'high' : 'medium'),
    level: 0,
    dependencies: index > 0 ? [`mcp-task-${index}`] : [],
    subtasks: []
  }));
}

/**
 * Maps MCP todo status to Agent Task status
 */
function mapMCPStatusToTaskStatus(mcpStatus: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'in_progress': 'in-progress',
    'in-progress': 'in-progress',
    'inprogress': 'in-progress',
    'active': 'in-progress',
    'working': 'in-progress',
    'completed': 'completed',
    'done': 'completed',
    'finished': 'completed',
    'failed': 'failed',
    'error': 'failed',
    'cancelled': 'failed',
    'canceled': 'failed'
  };

  return statusMap[mcpStatus.toLowerCase()] || 'pending';
}

/**
 * Syncs MCP TodoManager operations with Agent Task Store
 */
export function syncMCPOperationWithTaskStore(operation: TodoManagerOperation, messageId?: string): boolean {
  const { setTasks, updateTaskStatus, addTask, setActiveMessageId } = useAgentTaskStore.getState();
  let hasUpdates = false;

  console.log('[MCP-Task Bridge] Processing operation:', {
    type: operation.type,
    todosCount: operation.todos?.length || 0,
    taskId: operation.taskId,
    status: operation.status
  });

  switch (operation.type) {
    case 'todo_write':
      if (operation.todos && operation.todos.length > 0) {
        const tasks = convertMCPTodosToTasks(operation.todos);
        setTasks(tasks);
        if (messageId) {
          setActiveMessageId(messageId);
        }
        hasUpdates = true;
        console.log('[MCP-Task Bridge] Created tasks from MCP todo_write:', tasks.length);
      }
      break;

    case 'todo_update_status':
      if (operation.taskId && operation.status) {
        const mappedStatus = mapMCPStatusToTaskStatus(operation.status);
        updateTaskStatus(operation.taskId, mappedStatus);
        hasUpdates = true;
        console.log('[MCP-Task Bridge] Updated task status:', operation.taskId, '→', mappedStatus);
      }
      break;

    case 'todo_read':
      if (operation.todos && operation.todos.length > 0) {
        const tasks = convertMCPTodosToTasks(operation.todos);
        setTasks(tasks);
        if (messageId) {
          setActiveMessageId(messageId);
        }
        hasUpdates = true;
        console.log('[MCP-Task Bridge] Loaded tasks from MCP todo_read:', tasks.length);
      }
      break;
  }

  return hasUpdates;
}

/**
 * Processes MCP tool results for TodoManager operations
 */
export function processMCPToolResultForTaskSync(toolResult: MCPToolResult, messageId?: string): boolean {
  const operation = parseTodoManagerResult(toolResult);
  
  if (!operation) {
    return false;
  }

  return syncMCPOperationWithTaskStore(operation, messageId);
}

/**
 * Enhanced detection of TodoManager operations from tool call content
 */
export function detectTodoManagerFromContent(content: string): {
  hasTodoOperations: boolean;
  operations: string[];
} {
  const todoPatterns = [
    /todo_write/gi,
    /todo_update_status/gi,
    /todo_read/gi,
    /Todo Manager.*?(?:completed|todo_write|todo_update_status)/gi,
    /Tool Execution:.*?Todo Manager/gi
  ];

  const operations: string[] = [];
  let hasTodoOperations = false;

  for (const pattern of todoPatterns) {
    const matches = Array.from(content.matchAll(pattern));
    if (matches.length > 0) {
      hasTodoOperations = true;
      operations.push(...matches.map(m => m[0]));
    }
  }

  return { hasTodoOperations, operations };
}

/**
 * Extracts todo data from MCP tool execution results in chat content
 */
export function extractTodoDataFromExecutionResult(content: string): TodoManagerOperation[] {
  const operations: TodoManagerOperation[] = [];
  
  // Look for tool execution results that mention todo operations
  const toolResultPattern = /\*\*Tool Execution:.*?Todo Manager.*?\*\*([\s\S]*?)(?=\*\*Tool Execution:|$)/gi;
  const matches = Array.from(content.matchAll(toolResultPattern));
  
  for (const match of matches) {
    const resultContent = match[1];
    
    // Try to extract structured data from the result
    if (resultContent.includes('todo_write') || resultContent.includes('Created')) {
      // This looks like a todo_write operation
      const todos = extractTodosFromResult(resultContent);
      if (todos.length > 0) {
        operations.push({
          type: 'todo_write',
          todos
        });
      }
    } else if (resultContent.includes('todo_update_status') || resultContent.includes('Updated')) {
      // This looks like a status update
      const statusMatch = resultContent.match(/(?:task|todo)\s+(\w+).*?(?:status|to)\s+(\w+)/i);
      if (statusMatch) {
        operations.push({
          type: 'todo_update_status',
          taskId: statusMatch[1],
          status: statusMatch[2]
        });
      }
    }
  }
  
  return operations;
}

/**
 * Debug function to log MCP-Task bridge operations
 */
export function logMCPTaskSync(operation: string, data: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[MCP-Task Bridge] ${operation}:`, data);
  }
}