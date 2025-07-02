#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TaskStore, Task } from './task-store.js';

// Create server instance
const server = new Server(
  {
    name: 'mcp-todo-manager',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Initialize task store
const taskStore = new TaskStore();

// Define available tools
const TOOLS = [
  {
    name: 'todo_read',
    description: 'Read all current todos with their status',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'todo_write',
    description: 'Create or update a list of todos',
    inputSchema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          description: 'Array of tasks to create or update',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Task ID (optional, will be generated if not provided)' },
              title: { type: 'string', description: 'Task title' },
              description: { type: 'string', description: 'Task description' },
              status: { 
                type: 'string', 
                enum: ['pending', 'in-progress', 'completed', 'failed', 'need-help'],
                description: 'Task status' 
              },
              priority: { 
                type: 'string', 
                enum: ['high', 'medium', 'low'],
                description: 'Task priority' 
              },
              dependencies: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of task IDs this task depends on'
              },
              subtasks: {
                type: 'array',
                description: 'Array of subtasks',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    status: { type: 'string' },
                    priority: { type: 'string' },
                    tools: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'MCP tools needed for this subtask'
                    }
                  }
                }
              }
            },
            required: ['title']
          }
        }
      },
      required: ['tasks'],
    },
  },
  {
    name: 'todo_update_status',
    description: 'Update the status of a specific task',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID of the task to update' },
        status: { 
          type: 'string', 
          enum: ['pending', 'in-progress', 'completed', 'failed', 'need-help'],
          description: 'New status for the task' 
        },
      },
      required: ['taskId', 'status'],
    },
  },
  {
    name: 'todo_get_next',
    description: 'Get the next pending task to work on (considers dependencies)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'todo_clear',
    description: 'Clear all todos',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'todo_stats',
    description: 'Get statistics about current todos',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('[TodoManager] Listing available tools');
  return {
    tools: TOOLS,
  };
});

// Handle list resources request (none for now)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  console.error('[TodoManager] Listing resources (none)');
  return {
    resources: [],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  console.error(`[TodoManager] Executing tool: ${name}`);

  try {
    switch (name) {
      case 'todo_read': {
        const tasks = taskStore.getAllTasks();
        console.error(`[TodoManager] Reading ${tasks.length} tasks`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                tasks,
                stats: {
                  total: taskStore.getTotalTasksCount(),
                  completed: taskStore.getCompletedTasksCount(),
                  progress: taskStore.getProgress(),
                  inProgress: taskStore.getInProgressTasks().length
                }
              }, null, 2),
            },
          ],
        };
      }

      case 'todo_write': {
        const { tasks } = args as { tasks: Task[] };
        console.error(`[TodoManager] Writing ${tasks.length} tasks`);
        
        // Clear existing tasks if this is a new task list
        if (tasks.length > 0 && taskStore.getTotalTasksCount() === 0) {
          taskStore.clearTasks();
        }
        
        const createdTasks = taskStore.createTasks(tasks);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                created: createdTasks.length,
                tasks: createdTasks
              }, null, 2),
            },
          ],
        };
      }

      case 'todo_update_status': {
        const { taskId, status } = args as { taskId: string; status: string };
        console.error(`[TodoManager] Updating task ${taskId} to status: ${status}`);
        
        const updatedTask = taskStore.updateTaskStatus(taskId, status);
        if (!updatedTask) {
          throw new Error(`Task ${taskId} not found`);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                task: updatedTask,
                stats: {
                  total: taskStore.getTotalTasksCount(),
                  completed: taskStore.getCompletedTasksCount(),
                  progress: taskStore.getProgress()
                }
              }, null, 2),
            },
          ],
        };
      }

      case 'todo_get_next': {
        const nextTask = taskStore.getNextPendingTask();
        console.error(`[TodoManager] Next task: ${nextTask?.title || 'None'}`);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                hasNext: !!nextTask,
                task: nextTask || null,
                remainingTasks: taskStore.getAllTasks().filter(t => t.status === 'pending').length
              }, null, 2),
            },
          ],
        };
      }

      case 'todo_clear': {
        console.error('[TodoManager] Clearing all tasks');
        taskStore.clearTasks();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'All tasks cleared'
              }, null, 2),
            },
          ],
        };
      }

      case 'todo_stats': {
        const stats = {
          total: taskStore.getTotalTasksCount(),
          completed: taskStore.getCompletedTasksCount(),
          inProgress: taskStore.getInProgressTasks().length,
          pending: taskStore.getAllTasks().filter(t => t.status === 'pending').length,
          failed: taskStore.getAllTasks().filter(t => t.status === 'failed').length,
          needHelp: taskStore.getAllTasks().filter(t => t.status === 'need-help').length,
          progress: taskStore.getProgress()
        };
        
        console.error(`[TodoManager] Stats:`, stats);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`[TodoManager] Tool execution error:`, error);
    throw error;
  }
});

// Start the server
async function main() {
  console.error('[TodoManager] Starting MCP Todo Manager server...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[TodoManager] Server started successfully');
}

main().catch((error) => {
  console.error('[TodoManager] Fatal error:', error);
  process.exit(1);
});