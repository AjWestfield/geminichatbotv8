import type { Task } from '@/components/ui/agent-plan';

// Simple in-memory event bus for Server-Sent Events (SSE).
// Each connected client gets its own WritableStream writer. When a new event
// is published via `broadcast`, we write to every open writer.
// NOTE: This lives in the server bundle only. Memory resets on server reload.

export interface TaskEvent {
  action: 'create' | 'update' | 'clear';
  tasks?: Task[];
  taskId?: string;
  status?: string;
}

const clients = new Set<WritableStreamDefaultWriter<string>>();

export function addClient(writer: WritableStreamDefaultWriter<string>) {
  clients.add(writer);
  writer.closed.finally(() => clients.delete(writer)).catch(() => {});
}

export function broadcast(event: TaskEvent) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const writer of clients) {
    writer.write(data).catch(() => {
      // Remove broken connections
      clients.delete(writer);
    });
  }
}
