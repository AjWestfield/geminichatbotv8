import { NextRequest, NextResponse } from "next/server"
import { generateImageWithGPTImage1, generateImageWithContext } from "@/lib/openai-image-client"
import { ReplicateImageClient } from "@/lib/replicate-client"
import { uploadImageToBlob } from "@/lib/storage/blob-storage"
import { generateImageId } from "@/lib/image-utils"

export async function POST(req: NextRequest) {
  console.log("Image generation API called")

  try {
    // Parse request body
    const body = await req.json()
    console.log("Request body:", body)
    console.log("[API] Received model:", body.model)

    const {
      prompt,
      originalPrompt, // The full original prompt from the user
      model = "flux-kontext-pro", // Default to flux-kontext-pro
      quality = "standard", // Default quality
      style = "vivid",
      size = "1024x1024",
      imageContext, // For uploaded image editing
      originalImageId, // ID of the original image being edited
    } = body

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      )
    }

    if (model === "gpt-image-1") {
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        console.error("OPENAI_API_KEY not configured")
        return NextResponse.json(
          {
            error: "OpenAI API key not configured",
            details: "Please add OPENAI_API_KEY to your .env.local file."
          },
          { status: 500 }
        )
      }

      try {
        // Generate with GPT-Image-1 (DALL-E-3)
        console.log(`Generating image with GPT-Image-1: ${prompt}`)
        console.log(`Input quality: ${quality}`)
        
        // Map quality from UI format to GPT-Image-1 format
        // UI uses 'standard' or 'hd', GPT-Image-1 expects 'low', 'medium', or 'high'
        let mappedQuality: 'low' | 'medium' | 'high' = 'medium';
        
        if (quality === 'hd') {
          mappedQuality = 'high';
        } else if (quality === 'standard') {
          mappedQuality = 'medium';
        }
        
        console.log(`Quality mapping: ${quality} -> ${mappedQuality}`)
        
        // Check if we have image context (for uploaded image editing)
        let result;
        if (imageContext) {
          console.log('Using image context for generation (uploaded image editing)')
          result = await generateImageWithContext(
            prompt,
            imageContext,
            {
              quality: mappedQuality,
              size: size as "1024x1024" | "1536x1024" | "1024x1536",
              model: 'gpt-image-1'
            }
          )
        } else {
          result = await generateImageWithGPTImage1(
            prompt,
            {
              quality: mappedQuality,
              style: style,
              size: size as "1024x1024" | "1536x1024" | "1024x1536",
              n: 1,
            }
          )
        }

        console.log(`Successfully generated image with GPT-Image-1`)

        return NextResponse.json({
          success: true,
          images: [{
            url: result.imageUrl,
            revisedPrompt: result.revisedPrompt || prompt,
            index: 0,
          }],
          metadata: {
            model: "gpt-image-1",
            provider: "openai",
            quality: quality,
            mappedQuality: mappedQuality,
            style: style,
            size: size,
            originalPrompt: originalPrompt || prompt,
            imageCount: 1,
          }
        })

      } catch (error: any) {
        console.error("GPT-Image-1 generation error:", error)
        return NextResponse.json(
          {
            error: "Failed to generate image with GPT-Image-1",
            details: error.message || "Image generation failed"
          },
          { status: 500 }
        )
      }
    }

    // Handle Replicate models (Flux)
    if (model === "flux-kontext-pro" || model === "flux-kontext-max" || model === "flux-dev-ultra-fast") {
      // Check if Replicate API key is configured
      if (!process.env.REPLICATE_API_KEY) {
        console.error("REPLICATE_API_KEY not configured")
        return NextResponse.json(
          {
            error: "Replicate API key not configured",
            details: "Please add REPLICATE_API_KEY to your .env.local file."
          },
          { status: 500 }
        )
      }

      try {
        console.log(`Generating image with ${model}: ${prompt}`)
        
        // Map size to aspect ratio for Replicate
        const aspectRatioMap: Record<string, string> = {
          '1024x1024': '1:1',
          '1792x1024': '16:9',
          '1024x1536': '9:16'
        }
        
        const client = new ReplicateImageClient(process.env.REPLICATE_API_KEY)
        const imageUrl = await client.generateImage(model, prompt, {
          aspect_ratio: aspectRatioMap[size] || "1:1",
          output_format: "jpg",
          guidance_scale: style === 'vivid' ? 4.5 : 3.5,
        })

        console.log(`Successfully generated image with ${model}`)
        console.log(`[Generate] Replicate returned URL: ${imageUrl}`)
        
        // Immediately validate the URL to see if it's accessible
        let urlIsValid = false
        try {
          const validateResponse = await fetch(imageUrl, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(5000) // 5 second timeout
          })
          console.log(`[Generate] URL validation status: ${validateResponse.status}`)
          urlIsValid = validateResponse.ok || validateResponse.status === 206
          
          if (!urlIsValid) {
            console.error(`[Generate] Replicate URL is invalid immediately after generation! Status: ${validateResponse.status}`)
            console.error(`[Generate] This suggests an issue with the Replicate API or the specific model.`)
          }
        } catch (validateError) {
          console.error('[Generate] URL validation failed:', validateError)
          urlIsValid = false
        }
        
        // If URL is invalid immediately, try to download and convert to data URL
        if (!urlIsValid && imageUrl.includes('replicate.delivery')) {
          console.log('[Generate] Attempting to download image before it disappears...')
          try {
            const downloadResponse = await fetch(imageUrl)
            if (downloadResponse.ok) {
              const buffer = await downloadResponse.arrayBuffer()
              const base64 = Buffer.from(buffer).toString('base64')
              const contentType = downloadResponse.headers.get('content-type') || 'image/jpeg'
              const dataUrl = `data:${contentType};base64,${base64}`
              console.log('[Generate] Successfully converted to data URL before expiration')
              // Use the data URL as the image URL
              imageUrl = dataUrl
            }
          } catch (downloadError) {
            console.error('[Generate] Failed to download image:', downloadError)
            // Continue with original URL and hope for the best
          }
        }

        // Auto-upload Replicate images to permanent storage
        let permanentUrl = imageUrl
        if (imageUrl.includes('replicate.delivery') || imageUrl.startsWith('data:')) {
          console.log('[Image Generation] Auto-uploading Replicate image to blob storage')
          const imageId = generateImageId()
          const filename = `${imageId}.jpg`
          
          try {
            permanentUrl = await uploadImageToBlob(imageUrl, filename)
            console.log('[Image Generation] Successfully uploaded to blob:', permanentUrl)
          } catch (uploadError) {
            console.error('[Image Generation] Failed to upload to blob storage:', uploadError)
            // Continue with original URL if upload fails
          }
        }

        return NextResponse.json({
          success: true,
          images: [{
            url: permanentUrl,
            originalUrl: imageUrl, // Keep original URL for reference
            revisedPrompt: prompt,
            index: 0,
          }],
          metadata: {
            model: model,
            provider: "replicate",
            style: style,
            size: size,
            originalPrompt: originalPrompt || prompt,
            imageCount: 1,
            blobUploaded: permanentUrl !== imageUrl,
          }
        })

      } catch (error: any) {
        console.error(`${model} generation error:`, error)
        return NextResponse.json(
          {
            error: `Failed to generate image with ${model}`,
            details: error.message || "Image generation failed"
          },
          { status: 500 }
        )
      }
    }

    // Unknown model
    console.log(`Unknown model "${model}"`)
    return NextResponse.json(
      {
        error: `Unsupported model: ${model}`,
        details: "Supported models: gpt-image-1, flux-kontext-pro, flux-kontext-max, flux-dev-ultra-fast"
      },
      { status: 400 }
    )

  } catch (error) {
    console.error("Image generation API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}