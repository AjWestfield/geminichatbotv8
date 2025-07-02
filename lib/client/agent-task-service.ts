import { Task } from '@/components/ui/agent-plan';

/**
 * Thin client-side wrapper around the Agent Tasks SSE API.
 */
export const AgentTaskService = {
  async create(tasks: Task[]) {
    await fetch('/api/agent-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', tasks }),
    }).catch(console.error);
  },

  async update(taskId: string, status: string) {
    await fetch('/api/agent-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', taskId, status }),
    }).catch(console.error);
  },

  async clear() {
    await fetch('/api/agent-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear' }),
    }).catch(console.error);
  },
};
