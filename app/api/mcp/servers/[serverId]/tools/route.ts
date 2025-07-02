import { NextRequest, NextResponse } from 'next/server';
import { MCPServerManager } from '@/lib/mcp/mcp-server-manager';

// GET /api/mcp/servers/[serverId]/tools - List tools for a specific server
export async function GET(
  req: NextRequest,
  { params }: { params: { serverId: string } }
) {
  try {
    const serverId = params.serverId;
    
    const serverManager = MCPServerManager.getInstance();
    const server = serverManager.getServer(serverId);
    
    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }
    
    if (server.status !== 'connected') {
      return NextResponse.json(
        { error: 'Server not connected' },
        { status: 503 }
      );
    }
    
    // Try to get tools - this also serves as a health check
    try {
      const tools = await serverManager.listTools(serverId);
      return NextResponse.json({ 
        tools,
        status: 'connected',
        serverId
      });
    } catch (error) {
      // If we can't get tools, the connection might be dead
      return NextResponse.json(
        { 
          error: 'Failed to retrieve tools - connection may be lost',
          status: 'error'
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Error fetching server tools:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}