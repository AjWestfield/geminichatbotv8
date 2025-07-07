import { NextResponse } from 'next/server';
import { MCPServerManager } from '@/lib/mcp/mcp-server-manager';

// Initialize server manager and load saved servers
export async function GET() {
  try {
    const serverManager = MCPServerManager.getInstance();
    
    // Load servers from config (this also auto-connects servers)
    await serverManager.loadFromConfig();
    
    // Get all loaded servers with their current state
    const servers = serverManager.getAllServers();
    
    // Return detailed server info including connection state
    return NextResponse.json({ 
      success: true,
      message: 'MCP server manager initialized',
      serversLoaded: servers.length,
      servers: servers.map(server => ({
        id: server.config.id,
        name: server.config.name,
        status: server.status,
        connected: server.status === 'connected',
        toolsCount: server.tools?.length || 0,
        tools: server.tools,
        error: server.lastError,
        isDefault: false,
        autoConnect: false
      })),
      defaultServersAdded: false,
      autoConnectedServers: servers.filter(s => s.status === 'connected').map(s => s.config.id)
    });
  } catch (error) {
    console.error('Error initializing MCP:', error);
    return NextResponse.json(
      { error: 'Failed to initialize MCP' },
      { status: 500 }
    );
  }
}