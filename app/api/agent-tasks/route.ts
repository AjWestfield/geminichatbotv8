import { NextRequest, NextResponse } from 'next/server';
import { broadcast, addClient } from '@/lib/server/event-bus';

/**
 * POST /api/agent-tasks
 * Body: {
 *   action: 'create' | 'update' | 'clear',
 *   tasks?: Task[],
 *   taskId?: string,
 *   status?: string
 * }
 */
// SSE stream for real-time task events
export async function GET() {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  // Register this client
  addClient(writer);

  // Initial comment to establish stream
  writer.write(': connected\n\n');

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }

    // Simple validation
    broadcast(body);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[AgentTasks API] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
