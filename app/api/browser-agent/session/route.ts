import { NextRequest, NextResponse } from 'next/server';

// This route handles WebSocket upgrade for browser streaming
export async function GET(request: NextRequest) {
  const upgradeHeader = request.headers.get('upgrade');
  
  if (upgradeHeader !== 'websocket') {
    return new NextResponse('Expected WebSocket upgrade', { status: 426 });
  }

  // Return session info for WebSocket connection
  return NextResponse.json({
    wsUrl: `${process.env.BROWSER_AGENT_WS_URL || 'ws://localhost:8001'}/browser-stream`,
    protocol: 'browser-agent-v1'
  });
}

// Create a new browser session
export async function POST(request: NextRequest) {
  try {
    const { sessionId, mode } = await request.json();
    
    // Forward to Python browser service
    const response = await fetch(`${process.env.BROWSER_AGENT_URL || 'http://localhost:8001'}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        mode: mode || 'deep-research',
        config: {
          headless: false,
          viewport: { width: 1280, height: 720 }
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create browser session');
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Failed to create browser session:', error);
    return NextResponse.json(
      { error: 'Failed to create browser session' },
      { status: 500 }
    );
  }
}

// Close a browser session
export async function DELETE(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    // Forward to Python browser service
    const response = await fetch(`${process.env.BROWSER_AGENT_URL || 'http://localhost:8001'}/api/session/${sessionId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to close browser session');
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Failed to close browser session:', error);
    return NextResponse.json(
      { error: 'Failed to close browser session' },
      { status: 500 }
    );
  }
}
