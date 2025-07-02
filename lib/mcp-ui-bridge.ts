import { useAgentTaskStore } from '@/lib/stores/agent-task-store';
import { parseAgentTaskUpdate, normalizeTaskStatus } from '@/lib/agent-task-parser';
import { Task } from '@/components/ui/agent-plan';

/**
 * MCP-to-UI Bridge
 * 
 * This module provides functionality to sync MCP TodoWrite operations 
 * with the Agent Tasks UI component. It bridges the gap between the 
 * MCP server-based todo system and the visual task tracking interface.
 */

export interface MCPToolCall {
  server: string;
  tool: string;
  arguments: any;
  result?: any;
}

export interface MCPTaskUpdate {
  action: 'create' | 'update' | 'read';
  tasks?: any[];
  taskId?: string;
  status?: string;
  timestamp: number;
}

/**
 * Detects MCP TodoWrite operations from message content
 */
export function detectMCPToolCalls(content: string): MCPToolCall[] {
  const toolCalls: MCPToolCall[] = [];
  
  // Pattern to detect MCP tool calls in various formats
  const patterns = [
    /\[TOOL_CALL\]\s*Server:\s*([^\n]+)\s*Tool:\s*([^\n]+)\s*Arguments:\s*([^\n]+)/gi,
    /\[TodoWrite[^\]]*\]/gi,
    /TodoWrite[^:\n]*:/gi,
    /\[Using\s+TodoWrite[^\]]*\]/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[0].toLowerCase().includes('todowrite')) {
        toolCalls.push({
          server: 'todo-manager',
          tool: 'TodoWrite',
          arguments: extractTodoWriteArguments(match[0], content)
        });
      }
    }
  });
  
  return toolCalls;
}

/**
 * Extracts TodoWrite arguments from the matched content
 */
function extractTodoWriteArguments(match: string, fullContent: string): any {
  // Try to extract structured data from the TodoWrite call
  const taskListMatch = fullContent.match(/(?:creating|with)\s+tasks?:?\s*\n((?:[-•*\d]+\.?\s*.+\n?)+)/i);
  
  if (taskListMatch) {
    const taskLines = taskListMatch[1].split('\n').filter(line => line.trim());
    const todos = taskLines.map((line, index) => {
      const cleanLine = line.replace(/^[-•*\d]+\.?\s*/, '').trim();
      return {
        content: cleanLine,
        status: 'pending',
        priority: index === 0 ? 'high' : 'medium',
        id: `todo-${index + 1}`
      };
    });
    
    return { todos };
  }
  
  // Try to extract status updates
  const statusMatch = match.match(/Update\s+task\s+(\d+)\s+to\s+"([^"]+)"/i);
  if (statusMatch) {
    return {
      action: 'update',
      taskId: statusMatch[1],
      status: statusMatch[2]
    };
  }
  
  return { action: 'read' };
}

/**
 * Syncs MCP TodoWrite operations with the Agent Task Store
 */
export function syncMCPWithTaskStore(toolCalls: MCPToolCall[], messageId?: string): boolean {
  const { setTasks, updateTaskStatus, addTask, setActiveMessageId } = useAgentTaskStore.getState();
  let hasUpdates = false;
  
  toolCalls.forEach(toolCall => {
    if (toolCall.server === 'todo-manager' && toolCall.tool === 'TodoWrite') {
      const args = toolCall.arguments;
      
      if (args.todos && Array.isArray(args.todos)) {
        // Convert MCP todos to Agent Task format
        const tasks: Task[] = args.todos.map((todo: any, index: number) => ({
          id: todo.id || `task-${index + 1}`,
          title: todo.content || todo.title || '',
          description: todo.description || '',
          status: normalizeTaskStatus(todo.status || 'pending'),
          priority: todo.priority || (index === 0 ? 'high' : 'medium'),
          level: 0,
          dependencies: index > 0 ? [`task-${index}`] : [],
          subtasks: []
        }));
        
        if (tasks.length > 0) {
          setTasks(tasks);
          if (messageId) {
            setActiveMessageId(messageId);
          }
          hasUpdates = true;
        }
      } else if (args.action === 'update' && args.taskId && args.status) {
        updateTaskStatus(`task-${args.taskId}`, normalizeTaskStatus(args.status));
        hasUpdates = true;
      }
    }
  });
  
  return hasUpdates;
}

/**
 * Enhanced message processing to detect and sync MCP operations
 */
export function processMessageForMCPSync(content: string, messageId?: string): boolean {
  console.log('[MCP-UI Bridge] Processing message for task sync:', {
    messageId,
    contentLength: content.length,
    contentPreview: content.substring(0, 200) + '...'
  });
  
  // First try the enhanced parser
  const taskUpdates = parseAgentTaskUpdate(content);
  console.log('[MCP-UI Bridge] Parsed task updates:', {
    updateCount: taskUpdates.length,
    updateTypes: taskUpdates.map(u => u.type)
  });
  
  const { setTasks, updateTaskStatus, addTask, setActiveMessageId } = useAgentTaskStore.getState();
  
  let hasUpdates = false;
  
  if (taskUpdates.length > 0) {
    taskUpdates.forEach(update => {
      switch (update.type) {
        case 'create':
          // Only propagate MCP TodoWrite-created tasks (type=create) to the store.
          // Skip 'plan' updates so that brainstorm / supervisor plans do not trigger the UI.
          if (update.tasks && update.tasks.length > 0) {
            setTasks(update.tasks);
            if (messageId) {
              setActiveMessageId(messageId);
            }
            hasUpdates = true;
          }
          break;
          
        case 'update':
          if (update.taskId && update.status) {
            updateTaskStatus(update.taskId, update.status);
            hasUpdates = true;
          }
          break;
          
        case 'status':
          if (update.title && update.status) {
            // Try to find and update task by title
            const tasks = useAgentTaskStore.getState().tasks;
            const task = tasks.find(t => 
              t.title.toLowerCase().includes(update.title!.toLowerCase()) ||
              update.title!.toLowerCase().includes(t.title.toLowerCase())
            );
            if (task) {
              updateTaskStatus(task.id, update.status);
              hasUpdates = true;
            }
          }
          break;
      }
    });
  }
  
  // Fallback: try to detect MCP tool calls directly
  if (!hasUpdates) {
    const toolCalls = detectMCPToolCalls(content);
    if (toolCalls.length > 0) {
      hasUpdates = syncMCPWithTaskStore(toolCalls, messageId);
    }
  }
  
  return hasUpdates;
}

/**
 * Utility to convert Agent Tasks back to MCP format for syncing
 */
export function convertTasksToMCPFormat(tasks: Task[]): any[] {
  return tasks.map(task => ({
    content: task.title,
    status: task.status,
    priority: task.priority,
    id: task.id
  }));
}

/**
 * Debug function to log MCP sync operations
 */
export function logMCPSync(operation: string, data: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[MCP-UI Bridge] ${operation}:`, data);
  }
}