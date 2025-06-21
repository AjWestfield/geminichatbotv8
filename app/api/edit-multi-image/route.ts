import { NextRequest, NextResponse } from "next/server"
import { WaveSpeedMultiImageClient } from "@/lib/wavespeed-multi-client"

export async function POST(req: NextRequest) {
  console.log("[API] Multi-image edit API called")

  // Feature flag check
  if (process.env.DISABLE_WAVESPEED_MULTI_IMAGE === 'true') {
    return NextResponse.json(
      { 
        error: "Multi-image editing is temporarily disabled",
        details: "This feature is currently under maintenance. Please try again later."
      },
      { status: 503 }
    )
  }

  try {
    // Parse request body
    const body = await req.json()
    console.log("[API] Request body received:", {
      imageCount: body.images?.length || 0,
      hasPrompt: !!body.prompt,
      guidanceScale: body.guidanceScale,
      safetyTolerance: body.safetyTolerance
    })

    const {
      images,
      prompt,
      guidanceScale = 3.5,
      safetyTolerance = "2"
    }: {
      images: string[]
      prompt: string
      guidanceScale?: number
      safetyTolerance?: string
    } = body

    // Validate required parameters
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "Images array is required and must not be empty" },
        { status: 400 }
      )
    }

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      )
    }

    // Check minimum images requirement
    if (images.length < 2) {
      return NextResponse.json(
        { error: "At least 2 images are required for multi-image editing" },
        { status: 400 }
      )
    }

    // Check maximum images limit
    if (images.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 images allowed for multi-image editing" },
        { status: 400 }
      )
    }

    // Check if WaveSpeed API key is configured
    if (!process.env.WAVESPEED_API_KEY) {
      console.error("WAVESPEED_API_KEY not configured")
      return NextResponse.json(
        {
          error: "WaveSpeed API key not configured",
          details: "Please add WAVESPEED_API_KEY to your .env.local file"
        },
        { status: 500 }
      )
    }

    console.log("[API DEBUG] Received images details:", {
      count: images.length,
      types: images.map(url => url.startsWith('data:') ? 'data URL' : 'other'),
      sizes: images.map(url => `${(url.length / 1024).toFixed(2)}KB`),
      previews: images.map((url, i) => `${i+1}: ${url.substring(0, 50)}...`)
    })

    // Initialize WaveSpeed client
    const waveSpeedClient = new WaveSpeedMultiImageClient(process.env.WAVESPEED_API_KEY)

    // Validate images format (now async)
    const validation = await waveSpeedClient.validateImages(images)
    if (!validation.valid) {
      console.error("[API] Image validation failed:", validation.errors)
      return NextResponse.json(
        {
          error: "Invalid images provided",
          details: validation.errors.join(', ')
        },
        { status: 400 }
      )
    }

    console.log("[API] Starting multi-image generation with WaveSpeed...")

    // Convert HTTP URLs to base64 data URLs to prevent expiration issues
    console.log("[API] Converting HTTP URLs to base64...")
    const validatedImages = await Promise.all(images.map(async (imageUrl, index) => {
      if (imageUrl.startsWith('http')) {
        try {
          console.log(`[API] Fetching image ${index + 1}:`, imageUrl.substring(0, 100) + '...')
          const response = await fetch(imageUrl)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          
          const buffer = await response.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          const mimeType = response.headers.get('content-type') || 'image/jpeg'
          
          console.log(`[API] Image ${index + 1} converted:`, {
            originalUrl: imageUrl.substring(0, 50) + '...',
            mimeType,
            size: `${(buffer.byteLength / 1024).toFixed(2)}KB`
          })
          
          return `data:${mimeType};base64,${base64}`
        } catch (error) {
          console.error(`[API] Failed to fetch image ${index + 1}:`, error)
          throw new Error(`Failed to fetch image ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
      // Return data URLs as-is
      return imageUrl
    }))

    console.log("[API] All images converted successfully")

    // Generate the multi-image edit
    const result = await waveSpeedClient.generateMultiImageEdit({
      images: validatedImages,
      prompt,
      guidanceScale,
      safetyTolerance
    })

    if (!result.success) {
      console.error("[API] WaveSpeed generation failed:", result.error)
      return NextResponse.json(
        {
          error: "Multi-image generation failed",
          details: result.error || "Unknown error occurred"
        },
        { status: 500 }
      )
    }

    console.log("[API] Multi-image generation successful:", {
      hasImageUrl: !!result.imageUrl,
      taskId: result.taskId,
      model: result.metadata?.model
    })

    // Log WaveSpeed metadata if available
    if (result.metadata) {
      console.log("[API] WaveSpeed metadata:", result.metadata)
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      images: [{
        url: result.imageUrl,
        index: 0,
        revisedPrompt: prompt
      }],
      metadata: {
        model: 'flux-kontext-max-multi',
        provider: 'wavespeed',
        originalPrompt: prompt,
        editMode: true,
        method: 'multi-image-composition',
        imageCount: images.length,
        inputImages: images.length,
        guidanceScale,
        safetyTolerance,
        taskId: result.taskId,
        ...result.metadata
      }
    })

  } catch (error) {
    console.error("[API] Multi-image edit error:", error)
    
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Multi-image edit API is accessible",
    provider: "wavespeed",
    model: "flux-kontext-max-multi",
    capabilities: {
      features: [
        "Multi-Image Composition (2-10 images)",
        "Split-Screen Layouts",
        "Before/After Comparisons", 
        "Side-by-Side Collages",
        "Visual Collections"
      ],
      maxImages: 10,
      minImages: 2,
      supportedFormats: ["data URLs", "HTTP URLs"],
      model: "wavespeed-ai/flux-kontext-max/multi",
      description: "Creates split-screen layouts and comparisons from multiple images"
    }
  })
}
