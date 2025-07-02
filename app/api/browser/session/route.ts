import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle different request formats
    if (body.action) {
      // Handle action-based requests (create, navigate, close, etc.)
      const { action, sessionId, ...params } = body
      
      switch (action) {
        case 'create':
          // Create new session
          const newSessionId = crypto.randomUUID()
          const options = params.options || {}
          
          // Return mock session for now
          return NextResponse.json({
            success: true,
            session: {
              id: newSessionId,
              url: options.url || 'https://www.google.com',
              title: 'Browser Session',
              status: 'active',
              createdAt: new Date().toISOString(),
              screenshot: null
            }
          })
          
        case 'navigate':
          // Navigate to URL
          if (!sessionId) {
            return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 })
          }
          
          // For now, return success with mock data
          return NextResponse.json({
            success: true,
            content: {
              url: params.url,
              title: 'Page Title',
              html: '',
              text: '',
              screenshot: null
            }
          })
          
        case 'close':
          // Close session
          if (!sessionId) {
            return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 })
          }
          
          return NextResponse.json({ success: true })
          
        default:
          // Handle other actions (screenshot, click, etc.)
          return NextResponse.json({ success: true })
      }
    } else {
      // Handle query-based requests (browser-use style)
      const { query, enableStreaming, llm, embeddedMode } = body
      
      // Generate session ID
      const sessionId = crypto.randomUUID()
      
      // If in embedded mode, return mock session without calling external service
      if (embeddedMode) {
        console.log('[Browser Session API] Embedded mode - returning mock session')
        return NextResponse.json({ 
          sessionId,
          streamUrl: null,
          status: 'embedded',
          embeddedMode: true
        })
      }
      
      // Return mock session
      return NextResponse.json({ 
        sessionId,
        status: 'started'
      })
    }
  } catch (error) {
    console.error('[Browser Session API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start browser session' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const action = searchParams.get('action')
  const embeddedMode = searchParams.get('embeddedMode') === 'true'
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  }
  
  // If in embedded mode, return mock status
  if (embeddedMode) {
    return NextResponse.json({
      sessionId,
      status: 'active',
      embeddedMode: true
    })
  }
  
  // Handle status requests
  if (action === 'status') {
    // Return mock status
    return NextResponse.json({
      sessionId,
      status: 'active',
      screenshot: null,
      url: null,
      title: null
    })
  }
  
  // Legacy behavior for other services
  try {
    const response = await fetch(`http://localhost:8001/api/browser/session/${sessionId}`)
    
    if (!response.ok) {
      throw new Error('Failed to get session status')
    }
    
    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Browser Session API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get session status' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const embeddedMode = searchParams.get('embeddedMode') === 'true'
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  }
  
  // If in embedded mode, just return success
  if (embeddedMode) {
    return NextResponse.json({ status: 'stopped', embeddedMode: true })
  }
  
  try {
    const response = await fetch(`http://localhost:8001/api/browser/session/${sessionId}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      throw new Error('Failed to stop session')
    }
    
    return NextResponse.json({ status: 'stopped' })
  } catch (error) {
    console.error('[Browser Session API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to stop session' },
      { status: 500 }
    )
  }
}
