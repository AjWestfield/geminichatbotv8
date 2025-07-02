import { Task } from "@/components/ui/agent-plan";
import { convertTasksToMCPFormat } from "@/lib/mcp-ui-bridge";
import { useAgentTaskStore } from "@/lib/stores/agent-task-store";
import { AgentTaskService } from "@/lib/client/agent-task-service";

/**
 * Executes the tasks currently present in the AgentTaskStore using the
 * Todo-Manager MCP server. It keeps the UI in sync by updating the store each
 * time a status change is acknowledged by the server.
 *
 * For now execution is a stub (it immediately marks each task as completed)
 * but it demonstrates full round-trip sync via `todo_update_status` so the UI
 * updates in real time.
 */
export async function runAgentTasksViaTodoManager() {
  const state = useAgentTaskStore.getState();
  if (state.tasks.length === 0) return;

  // Broadcast creation of tasks via SSE API
  await AgentTaskService.create(state.tasks);

  const serverId = "todo-manager";
  // Ensure the server is connected (call the Next.js connect API)
  try {
    await fetch(`/api/mcp/servers/${serverId}/connect`, { method: 'POST' });
  } catch (err) {
    console.error('[AgentTaskExecutor] Failed to connect to Todo Manager:', err);
    return;
  }

  // Helper to call tools via the Next.js API route
  async function executeTool(toolName: string, args: any) {
    const res = await fetch('/api/mcp/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId, toolName, arguments: args })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || `Tool ${toolName} failed`);
    }
    const data = await res.json();
    return data.result;
  }

  // 1. Persist the plan to the MCP server (todo_write)
  const mcpTasks = convertTasksToMCPFormat(state.tasks);
  try {
    await executeTool('todo_write', { tasks: mcpTasks });
  } catch (err) {
    console.error('[AgentTaskExecutor] todo_write failed:', err);
  }

  // 2. Sequentially mark tasks as in-progress → completed (stub execution)
  for (const task of state.tasks) {
    // in-progress
    await updateStatus(task, "in-progress");
    // TODO: real agent work should happen here
    await updateStatus(task, "completed");
  }

  async function updateStatus(task: Task, status: string) {
    // Update UI immediately
    useAgentTaskStore.getState().updateTaskStatus(task.id, status);
    // Broadcast to all connected clients
    await AgentTaskService.update(task.id, status);

    try {
      await executeTool('todo_update_status', { taskId: task.id, status });
    } catch (err) {
      console.error(`[AgentTaskExecutor] todo_update_status (${task.id} → ${status}) failed`, err);
    }
  }
}
