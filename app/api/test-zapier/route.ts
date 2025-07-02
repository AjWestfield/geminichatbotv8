import { NextResponse } from 'next/server'
import { ZapierMCPClient } from '@/lib/mcp/zapier-mcp-client'

export async function GET() {
  console.log('[Test Zapier] Starting test...')
  
  try {
    const client = ZapierMCPClient.getInstance()
    
    // Test connection
    console.log('[Test Zapier] Connecting...')
    await client.connect()
    console.log('[Test Zapier] Connected successfully!')
    
    // Get available tools
    const tools = await client.getAvailableTools()
    console.log(`[Test Zapier] Found ${tools.length} tools`)
    
    // Filter for social media tools
    const socialTools = tools.filter(tool => 
      tool.name.includes('youtube') || 
      tool.name.includes('instagram') || 
      tool.name.includes('facebook') ||
      tool.name.includes('find') ||
      tool.name.includes('post') ||
      tool.name.includes('publish')
    )
    
    // Test YouTube query
    let youtubeResult = null
    try {
      console.log('[Test Zapier] Testing YouTube query...')
      youtubeResult = await client.executeTool('youtube_find_video', {
        channel: 'Aj and Selena',
        query: 'latest video from Aj and Selena channel',
        max_results: 1
      })
      console.log('[Test Zapier] YouTube query successful!')
    } catch (error: any) {
      console.error('[Test Zapier] YouTube query failed:', error)
    }
    
    // Disconnect
    await client.disconnect()
    
    return NextResponse.json({
      success: true,
      connection: 'successful',
      totalTools: tools.length,
      socialMediaTools: socialTools.length,
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        required: t.inputSchema?.required || []
      })),
      socialToolDetails: socialTools,
      youtubeQueryResult: youtubeResult,
      credentials: {
        url: process.env.ZAPIER_MCP_SERVER_URL,
        hasApiKey: !!process.env.ZAPIER_MCP_API_KEY
      }
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error: any) {
    console.error('[Test Zapier] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      credentials: {
        url: process.env.ZAPIER_MCP_SERVER_URL,
        hasApiKey: !!process.env.ZAPIER_MCP_API_KEY
      }
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

export async function POST(request: Request) {
  const body = await request.json()
  
  try {
    const client = ZapierMCPClient.getInstance()
    await client.connect()
    
    const { tool, params } = body
    const result = await client.executeTool(tool, params)
    
    await client.disconnect()
    
    return NextResponse.json({
      success: true,
      result
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}