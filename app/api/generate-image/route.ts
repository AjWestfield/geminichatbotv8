import { NextResponse } from 'next/server'
import { generateImageWithGPTImage1 } from '@/lib/openai-image-client'
import { ReplicateImageClient } from '@/lib/replicate-client'
import { uploadImageToBlob } from '@/lib/storage/blob-storage'
import { generateImageId } from '@/lib/image-utils'

export async function POST(req: Request) {
  try {
    const {
      prompt,
      originalPrompt,
      model = 'gpt-image-1',
      quality = 'hd',
      style = 'vivid',
      size = '1024x1024'
    } = await req.json()

    console.log('[Generate Image API] Request received:', {
      model,
      quality,
      style,
      size,
      promptLength: prompt?.length
    })

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    let result
    
    try {
      if (model === 'gpt-image-1') {
        // Check if OpenAI API key is configured
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your .env.local file.')
        }

        // Map quality values for GPT-Image-1
        // Chat interface sends 'standard' or 'hd', but GPT-Image-1 expects 'low', 'medium', 'high'
        let gptQuality: 'low' | 'medium' | 'high' = 'medium'
        if (quality === 'hd') {
          gptQuality = 'high'
        } else if (quality === 'standard') {
          gptQuality = 'medium'
        }

        result = await generateImageWithGPTImage1(prompt, {
          size: size as any,
          quality: gptQuality,
          output_format: 'png',
          n: 1
        })
      } else if (model === 'flux-kontext-pro' || model === 'flux-kontext-max' || model === 'flux-dev-ultra-fast') {
        // Check if Replicate API key is configured
        if (!process.env.REPLICATE_API_KEY) {
          throw new Error('Replicate API key not configured. Please add REPLICATE_API_KEY to your .env.local file.')
        }

        const replicateClient = new ReplicateImageClient(process.env.REPLICATE_API_KEY!)
        
        // Map size to aspect ratio for Replicate
        let aspectRatio = '1:1'
        if (size === '1792x1024') aspectRatio = '16:9'
        else if (size === '1024x1536') aspectRatio = '9:16'
        
        const imageUrl = await replicateClient.generateImage(
          model as 'flux-kontext-pro' | 'flux-kontext-max' | 'flux-dev-ultra-fast',
          prompt,
          {
            aspect_ratio: aspectRatio,
            output_format: 'png'
          }
        )
        
        result = {
          success: true,
          imageUrl,
          model
        }
      } else {
        throw new Error(`Unsupported model: ${model}`)
      }

      // Ensure result has the expected structure
      if (!result || !result.imageUrl) {
        throw new Error('Failed to generate image - no image URL returned')
      }

      // Auto-upload to permanent storage for Replicate and WaveSpeed URLs
      let permanentUrl = result.imageUrl
      const needsPermanentStorage = 
        result.imageUrl.includes('replicate.delivery') ||
        result.imageUrl.includes('wavespeed') ||
        model === 'flux-kontext-pro' ||
        model === 'flux-kontext-max' ||
        model === 'flux-dev-ultra-fast'

      if (needsPermanentStorage) {
        console.log('[Generate Image API] Auto-uploading to permanent storage...')
        const imageId = generateImageId()
        const filename = `generated_${imageId}_${Date.now()}.png`
        
        try {
          permanentUrl = await uploadImageToBlob(result.imageUrl, filename)
          console.log('[Generate Image API] Successfully uploaded to blob:', permanentUrl)
        } catch (uploadError) {
          console.error('[Generate Image API] Failed to upload to blob storage:', uploadError)
          // Continue with original URL if upload fails, but log warning
          console.warn('[Generate Image API] WARNING: Image URL may expire soon. URL:', result.imageUrl.substring(0, 100))
        }
      }

      // Return successful response
      return NextResponse.json({
        success: true,
        images: [{
          url: permanentUrl,
          originalUrl: permanentUrl !== result.imageUrl ? result.imageUrl : undefined,
          revisedPrompt: result.revisedPrompt || prompt
        }],
        metadata: {
          model: result.model || model,
          quality,
          style,
          size,
          originalPrompt: originalPrompt || prompt,
          permanentStorage: permanentUrl !== result.imageUrl
        }
      })
    } catch (error: any) {
      console.error(`[Generate Image API] ${model} generation error:`, error)
      
      // Return error response with the specific error message
      return NextResponse.json({
        success: false,
        error: error.message || `Failed to generate image with ${model}`,
        model,
        prompt
      })
    }
  } catch (error: any) {
    console.error('[Generate Image API] Unexpected error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'An unexpected error occurred' 
      },
      { status: 500 }
    )
  }
}

// Runtime configuration for Vercel
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds timeout