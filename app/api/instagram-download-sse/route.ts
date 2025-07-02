import { GoogleAIFileManager } from "@google/generative-ai/server"
import type { NextRequest } from "next/server"

// Create SSE response helper
function createSSEResponse(encoder: TextEncoder) {
  let streamClosed = false
  
  const sendEvent = (data: any) => {
    if (streamClosed) return
    const message = `data: ${JSON.stringify(data)}\n\n`
    return encoder.encode(message)
  }
  
  const close = () => {
    streamClosed = true
  }
  
  return { sendEvent, close }
}

export async function POST(req: NextRequest) {
  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  })

  const encoder = new TextEncoder()
  const { sendEvent } = createSSEResponse(encoder)

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial progress
        controller.enqueue(sendEvent({
          status: 'initializing',
          progress: 0,
          message: 'Starting Instagram download...'
        }))

        const { url, cookies } = await req.json()

        if (!url) {
          controller.enqueue(sendEvent({
            status: 'error',
            error: 'No URL provided',
            message: 'Please provide an Instagram URL'
          }))
          controller.close()
          return
        }

        controller.enqueue(sendEvent({
          status: 'fetching',
          progress: 10,
          message: 'Fetching Instagram media...'
        }))

        // Simulate progressive download with more granular updates
        const simulateProgress = async (startProgress: number, endProgress: number, duration: number, message: string) => {
          const steps = 10
          const stepDelay = duration / steps
          const progressIncrement = (endProgress - startProgress) / steps

          for (let i = 0; i < steps; i++) {
            const currentProgress = startProgress + (progressIncrement * (i + 1))
            controller.enqueue(sendEvent({
              status: 'downloading',
              progress: Math.round(currentProgress),
              message: `${message}: ${Math.round((i + 1) / steps * 100)}%`
            }))
            await new Promise(resolve => setTimeout(resolve, stepDelay))
          }
        }

        // Simulate download phases
        await simulateProgress(10, 30, 1000, 'Analyzing media')
        await simulateProgress(30, 60, 1500, 'Downloading content')
        await simulateProgress(60, 80, 1000, 'Processing media')

        controller.enqueue(sendEvent({
          status: 'uploading',
          progress: 85,
          message: 'Uploading to Gemini...'
        }))

        // Call the original Instagram download API
        const response = await fetch(new URL('/api/instagram-download', req.url).toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url, cookies })
        })

        if (!response.ok) {
          const errorData = await response.json()
          
          if (response.status === 401 || errorData.requiresAuth) {
            controller.enqueue(sendEvent({
              status: 'error',
              error: 'AUTHENTICATION_REQUIRED',
              requiresAuth: true,
              message: 'This content requires Instagram login'
            }))
          } else {
            controller.enqueue(sendEvent({
              status: 'error',
              error: errorData.error || 'Download failed',
              message: errorData.details || 'Failed to download Instagram media'
            }))
          }
          controller.close()
          return
        }

        controller.enqueue(sendEvent({
          status: 'finalizing',
          progress: 95,
          message: 'Finalizing download...'
        }))

        const result = await response.json()

        controller.enqueue(sendEvent({
          status: 'completed',
          progress: 100,
          message: 'Download completed!',
          result
        }))

        controller.close()
      } catch (error) {
        console.error('[Instagram Download SSE] Error:', error)
        controller.enqueue(sendEvent({
          status: 'error',
          error: error.message,
          message: 'An unexpected error occurred'
        }))
        controller.close()
      }
    }
  })

  return new Response(stream, { headers })
}