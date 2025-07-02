import { NextResponse } from 'next/server'
import { ZapierAnthropicIntegration } from '@/lib/mcp/zapier-anthropic-integration'

export async function GET() {
  console.log('[Test Zapier Anthropic] Starting test...')
  
  try {
    const integration = new ZapierAnthropicIntegration()
    
    // Test listing available tools
    console.log('[Test Zapier Anthropic] Listing available tools...')
    const toolsResponse = await integration.listAvailableTools()
    
    // Test YouTube query
    let youtubeResult = null
    try {
      console.log('[Test Zapier Anthropic] Testing YouTube query...')
      youtubeResult = await integration.getLatestYouTubeVideo('Aj and Selena')
      console.log('[Test Zapier Anthropic] YouTube query successful!')
    } catch (error: any) {
      console.error('[Test Zapier Anthropic] YouTube query failed:', error)
    }
    
    return NextResponse.json({
      success: true,
      method: 'Anthropic SDK with MCP servers',
      toolsResponse: {
        content: toolsResponse.content?.[0]?.text || 'No response',
        usage: toolsResponse.usage,
      },
      youtubeResult: youtubeResult ? {
        content: youtubeResult.content?.[0]?.text || 'No response',
        usage: youtubeResult.usage,
      } : null,
      credentials: {
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        zapierUrl: process.env.ZAPIER_MCP_SERVER_URL,
        hasZapierKey: !!process.env.ZAPIER_MCP_API_KEY,
      }
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error: any) {
    console.error('[Test Zapier Anthropic] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.response?.data || error,
      credentials: {
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        zapierUrl: process.env.ZAPIER_MCP_SERVER_URL,
        hasZapierKey: !!process.env.ZAPIER_MCP_API_KEY,
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
    const integration = new ZapierAnthropicIntegration()
    const result = await integration.executeZapierQuery(body.query)
    
    return NextResponse.json({
      success: true,
      result: {
        content: result.content?.[0]?.text || 'No response',
        usage: result.usage,
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}