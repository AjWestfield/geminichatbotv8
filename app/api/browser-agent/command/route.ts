import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId, command, type = 'natural-language' } = await request.json();
    
    if (!sessionId || !command) {
      return NextResponse.json(
        { error: 'Session ID and command are required' },
        { status: 400 }
      );
    }

    // Stream the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Forward command to browser service
          const response = await fetch(`${process.env.BROWSER_AGENT_URL || 'http://localhost:8001'}/api/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sessionId,
              command,
              type,
              stream: true
            })
          });

          if (!response.ok) {
            throw new Error('Failed to execute command');
          }

          // Stream the response
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No response body');
          }

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim().startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                
                try {
                  const parsed = JSON.parse(data);
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(parsed)}\n\n`));
                } catch (e) {
                  console.error('Failed to parse SSE data:', e);
                }
              }
            }
          }

          // Process any remaining data
          if (buffer.trim()) {
            controller.enqueue(new TextEncoder().encode(`data: ${buffer}\n\n`));
          }

          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`));
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
    
  } catch (error) {
    console.error('Failed to process browser command:', error);
    return NextResponse.json(
      { error: 'Failed to process browser command' },
      { status: 500 }
    );
  }
}
