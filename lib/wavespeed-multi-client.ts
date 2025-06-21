/**
 * WaveSpeed Multi-Image Client
 * Handles multi-image editing using WaveSpeed AI's Flux Kontext Max Multi model
 */

export interface WaveSpeedMultiImageRequest {
  images: string[] // Array of image URLs or data URLs
  prompt: string
  guidanceScale?: number
  safetyTolerance?: string
}

export interface WaveSpeedMultiImageResponse {
  success: boolean
  imageUrl?: string
  taskId?: string
  error?: string
  metadata?: {
    model: string
    provider: string
    processedInputs?: any
    executionTime?: number
  }
}

export class WaveSpeedMultiImageClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.WAVESPEED_API_KEY || ''
    this.baseUrl = 'https://api.wavespeed.ai/api/v3'
    
    if (!this.apiKey) {
      throw new Error('WaveSpeed API key is required')
    }
  }

  /**
   * Generate a multi-image edit using WaveSpeed AI
   */
  async generateMultiImageEdit(request: WaveSpeedMultiImageRequest): Promise<WaveSpeedMultiImageResponse> {
    console.log('[WaveSpeed Multi] Starting multi-image generation with:', {
      imageCount: request.images.length,
      prompt: request.prompt,
      guidanceScale: request.guidanceScale,
      safetyTolerance: request.safetyTolerance
    })

    try {
      // Prepare the payload for WaveSpeed API
      const payload = {
        guidance_scale: request.guidanceScale || 3.5,
        images: request.images,
        prompt: request.prompt,
        safety_tolerance: request.safetyTolerance || "2"
      }

      console.log('[WaveSpeed DEBUG] Payload being sent:', {
        imageCount: payload.images.length,
        imageSizes: payload.images.map(img => `${(img.length / 1024).toFixed(2)}KB`),
        imageTypes: payload.images.map(img => {
          if (img.startsWith('data:')) return 'data URL'
          if (img.startsWith('http')) return 'HTTP URL'
          return 'unknown'
        }),
        prompt: payload.prompt,
        guidanceScale: payload.guidance_scale,
        safetyTolerance: payload.safety_tolerance
      })

      // Submit the task to WaveSpeed API
      const submitResponse = await fetch(`${this.baseUrl}/wavespeed-ai/flux-kontext-max/multi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      })

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text()
        console.error('[WaveSpeed Multi] Submit error:', submitResponse.status, errorText)
        throw new Error(`Failed to submit task: ${submitResponse.status} ${errorText}`)
      }

      const submitResult = await submitResponse.json()
      console.log('[WaveSpeed Multi] Task submitted:', submitResult)

      const taskId = submitResult.data?.id || submitResult.id
      if (!taskId) {
        throw new Error('No task ID received from WaveSpeed API')
      }

      // Poll for completion
      const resultUrl = `${this.baseUrl}/predictions/${taskId}/result`
      let attempts = 0
      const maxAttempts = 120 // 2 minutes with 1-second intervals

      console.log('[WaveSpeed Multi] Polling for completion...')

      while (attempts < maxAttempts) {
        // Exponential backoff with max wait time of 10 seconds
        const waitTime = Math.min(1000 * Math.pow(1.5, Math.min(attempts, 10)), 10000)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        attempts++

        try {
          const pollResponse = await fetch(resultUrl, {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            }
          })

          if (!pollResponse.ok) {
            console.warn(`[WaveSpeed Multi] Poll attempt ${attempts} failed:`, pollResponse.status)
            continue
          }

          const pollResult = await pollResponse.json()
          console.log(`[WaveSpeed Multi] Poll attempt ${attempts}:`, {
            status: pollResult.data?.status || pollResult.status,
            hasOutput: !!(pollResult.data?.outputs || pollResult.outputs),
            error: pollResult.data?.error || pollResult.error,
            message: pollResult.data?.message || pollResult.message
          })

          const status = pollResult.data?.status || pollResult.status
          const outputs = pollResult.data?.outputs || pollResult.outputs

          if (status === 'completed' && outputs && outputs.length > 0) {
            const imageUrl = outputs[0]
            console.log('[WaveSpeed Multi] Generation completed:', {
              imageUrl: imageUrl.substring(0, 50) + '...',
              attempts,
              totalTime: `${attempts}s`
            })

            return {
              success: true,
              imageUrl,
              taskId,
              metadata: {
                model: 'wavespeed-ai/flux-kontext-max/multi',
                provider: 'wavespeed',
                processedInputs: {
                  images: request.images.map((img, i) => ({
                    index: i + 1,
                    type: img.startsWith('data:') ? 'data URL' : 'HTTP URL',
                    size: `${(img.length / 1024).toFixed(2)}KB`
                  })),
                  prompt: request.prompt
                },
                executionTime: attempts * 1000 // Approximate time in ms
              }
            }
          } else if (status === 'failed') {
            // Log full response for debugging
            console.log('[WaveSpeed Multi] Full poll response for debugging:', JSON.stringify(pollResult, null, 2))
            
            // Check multiple possible error locations
            const errorMessage = pollResult.data?.error || pollResult.error || pollResult.message || pollResult.data?.message || 'Unknown error'
            console.error('[WaveSpeed Multi] Task failed with error:', errorMessage)
            throw new Error(`Task failed: ${errorMessage}`)
          }

          // Continue polling if status is 'processing' or 'starting'
        } catch (pollError) {
          console.warn(`[WaveSpeed Multi] Poll attempt ${attempts} error:`, pollError)
          if (attempts >= maxAttempts) {
            throw pollError
          }
        }
      }

      throw new Error('Task timed out after 2 minutes')

    } catch (error) {
      console.error('[WaveSpeed Multi] Generation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          model: 'wavespeed-ai/flux-kontext-max/multi',
          provider: 'wavespeed'
        }
      }
    }
  }

  /**
   * Validate that images are in the correct format for WaveSpeed API
   */
  async validateImages(images: string[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    if (!images || images.length === 0) {
      errors.push('At least one image is required')
    }

    if (images.length > 10) {
      errors.push('Maximum 10 images allowed')
    }

    // Basic validation first
    images.forEach((image, index) => {
      if (!image || typeof image !== 'string') {
        errors.push(`Image ${index + 1} is invalid`)
      } else if (!image.startsWith('data:') && !image.startsWith('http')) {
        errors.push(`Image ${index + 1} must be a data URL or HTTP URL`)
      }
    })

    // Check if HTTP URLs are accessible
    for (const [index, image] of images.entries()) {
      if (image && image.startsWith('http')) {
        try {
          console.log(`[WaveSpeed Multi] Validating URL accessibility for image ${index + 1}:`, image.substring(0, 100) + '...')
          const response = await fetch(image, { method: 'HEAD' })
          if (!response.ok) {
            errors.push(`Image ${index + 1} URL is not accessible (HTTP ${response.status})`)
            console.error(`[WaveSpeed Multi] Image ${index + 1} validation failed:`, response.status, response.statusText)
          } else {
            const contentType = response.headers.get('content-type')
            const contentLength = response.headers.get('content-length')
            console.log(`[WaveSpeed Multi] Image ${index + 1} validated:`, {
              contentType,
              contentLength: contentLength ? `${(parseInt(contentLength) / 1024).toFixed(2)}KB` : 'unknown'
            })
            
            // Warn if image is suspiciously small
            if (contentLength && parseInt(contentLength) < 1000) {
              errors.push(`Image ${index + 1} is suspiciously small (${contentLength} bytes)`)
            }
          }
        } catch (e) {
          errors.push(`Image ${index + 1} URL cannot be validated: ${e instanceof Error ? e.message : 'Unknown error'}`)
          console.error(`[WaveSpeed Multi] Image ${index + 1} validation error:`, e)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export default WaveSpeedMultiImageClient
