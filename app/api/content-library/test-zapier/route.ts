import { NextRequest, NextResponse } from "next/server"
import { ZapierMCPClient } from "@/lib/mcp/zapier-mcp-client"
import { MCPServerManager } from "@/lib/mcp/mcp-server-manager"
import { ZAPIER_MCP_SERVER_CONFIG } from "@/lib/mcp/zapier-mcp-config"

export async function GET(req: NextRequest) {
  try {
    console.log('[Test Zapier] Starting Zapier MCP test...')
    
    // Check if credentials are configured
    if (!process.env.ZAPIER_MCP_SERVER_URL || !process.env.ZAPIER_MCP_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Zapier MCP credentials not configured',
        instructions: 'Please add ZAPIER_MCP_SERVER_URL and ZAPIER_MCP_API_KEY to your .env.local file'
      }, { status: 400 })
    }

    const serverManager = MCPServerManager.getInstance()
    const results: any = {
      credentials: {
        url: process.env.ZAPIER_MCP_SERVER_URL,
        hasApiKey: !!process.env.ZAPIER_MCP_API_KEY
      },
      connection: null,
      tools: null,
      resources: null,
      error: null
    }

    try {
      // Try to connect to Zapier MCP
      console.log('[Test Zapier] Attempting to connect...')
      
      // Check if already connected
      const existingServer = serverManager.getServer(ZAPIER_MCP_SERVER_CONFIG.id)
      if (existingServer && existingServer.status === 'connected') {
        console.log('[Test Zapier] Already connected')
        results.connection = 'Already connected'
      } else {
        // Add server if not exists
        if (!existingServer) {
          await serverManager.addServer(ZAPIER_MCP_SERVER_CONFIG)
        }
        
        // Connect
        await serverManager.connectServer(ZAPIER_MCP_SERVER_CONFIG.id)
        results.connection = 'Connected successfully'
      }

      // List available tools
      console.log('[Test Zapier] Fetching available tools...')
      const tools = await serverManager.listTools(ZAPIER_MCP_SERVER_CONFIG.id)
      results.tools = tools

      // List available resources
      console.log('[Test Zapier] Fetching available resources...')
      try {
        const resources = await serverManager.listResources(ZAPIER_MCP_SERVER_CONFIG.id)
        results.resources = resources
      } catch (resourceError) {
        console.log('[Test Zapier] No resources available or error fetching resources')
        results.resources = []
      }

      // Try to call list actions if available
      if (tools.some((tool: any) => tool.name === 'list_available_actions')) {
        console.log('[Test Zapier] Calling list_available_actions...')
        try {
          const actions = await serverManager.executeTool(
            ZAPIER_MCP_SERVER_CONFIG.id,
            'list_available_actions',
            {}
          )
          results.availableActions = actions
        } catch (actionError) {
          console.error('[Test Zapier] Error calling list_available_actions:', actionError)
        }
      }

    } catch (error) {
      console.error('[Test Zapier] Error:', error)
      results.error = error instanceof Error ? error.message : 'Unknown error'
      results.connection = 'Failed to connect'
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Test Zapier] Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Test specific tool execution
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { toolName, params = {} } = body

    if (!toolName) {
      return NextResponse.json({
        success: false,
        error: 'Tool name is required'
      }, { status: 400 })
    }

    const serverManager = MCPServerManager.getInstance()
    
    // Ensure connected
    const server = serverManager.getServer(ZAPIER_MCP_SERVER_CONFIG.id)
    if (!server || server.status !== 'connected') {
      // Try to connect
      if (!server) {
        await serverManager.addServer(ZAPIER_MCP_SERVER_CONFIG)
      }
      await serverManager.connectServer(ZAPIER_MCP_SERVER_CONFIG.id)
    }

    // Execute tool
    console.log(`[Test Zapier] Executing tool: ${toolName} with params:`, params)
    const result = await serverManager.executeTool(
      ZAPIER_MCP_SERVER_CONFIG.id,
      toolName,
      params
    )

    return NextResponse.json({
      success: true,
      toolName,
      params,
      result
    })

  } catch (error) {
    console.error('[Test Zapier] Error executing tool:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}