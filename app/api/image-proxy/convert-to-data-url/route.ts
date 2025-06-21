import { NextRequest, NextResponse } from "next/server"

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB limit

export async function POST(req: NextRequest) {
  console.log("[image-proxy] Convert to data URL request received")
  
  try {
    const { imageUrl } = await req.json()
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      )
    }
    
    console.log("[image-proxy] Processing URL:", imageUrl.substring(0, 100) + "...")
    
    // Security check: Only allow specific domains
    const allowedDomains = [
      'replicate.delivery',
      'replicate.com',
      'storage.googleapis.com',
      'blob.vercel-storage.com'
    ]
    
    const url = new URL(imageUrl)
    const isAllowed = allowedDomains.some(domain => url.hostname.includes(domain))
    
    if (!isAllowed) {
      console.error("[image-proxy] Blocked unauthorized domain:", url.hostname)
      return NextResponse.json(
        { error: "URL domain not allowed for security reasons" },
        { status: 403 }
      )
    }
    
    // Fetch the image with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    
    try {
      const response = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        console.error(`[image-proxy] Failed to fetch image: ${response.status} ${response.statusText}`)
        return NextResponse.json(
          { error: `Failed to fetch image: ${response.status} ${response.statusText}` },
          { status: response.status }
        )
      }
      
      // Check content type
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.startsWith('image/')) {
        console.error("[image-proxy] Invalid content type:", contentType)
        return NextResponse.json(
          { error: "URL does not point to a valid image" },
          { status: 400 }
        )
      }
      
      // Check content length
      const contentLength = response.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE) {
        console.error("[image-proxy] Image too large:", contentLength)
        return NextResponse.json(
          { error: `Image too large. Maximum size is ${MAX_IMAGE_SIZE / 1024 / 1024}MB` },
          { status: 413 }
        )
      }
      
      // Read image data
      const arrayBuffer = await response.arrayBuffer()
      
      // Additional size check after download
      if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) {
        console.error("[image-proxy] Downloaded image too large:", arrayBuffer.byteLength)
        return NextResponse.json(
          { error: `Image too large. Maximum size is ${MAX_IMAGE_SIZE / 1024 / 1024}MB` },
          { status: 413 }
        )
      }
      
      // Convert to base64 data URL
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      const dataUrl = `data:${contentType};base64,${base64}`
      
      console.log("[image-proxy] Successfully converted to data URL, size:", Math.round(dataUrl.length / 1024), "KB")
      
      return NextResponse.json({
        success: true,
        dataUrl,
        metadata: {
          originalUrl: imageUrl,
          contentType,
          sizeBytes: arrayBuffer.byteLength,
          sizeKB: Math.round(arrayBuffer.byteLength / 1024)
        }
      })
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        console.error('[image-proxy] Request timed out')
        return NextResponse.json(
          { error: "Request timed out after 30 seconds" },
          { status: 408 }
        )
      }
      
      throw fetchError
    }
    
  } catch (error: any) {
    console.error("[image-proxy] Error converting image:", error)
    return NextResponse.json(
      { 
        error: "Failed to convert image",
        details: error.message || "Unknown error"
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Image proxy convert-to-data-url endpoint",
    capabilities: {
      maxSize: `${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
      allowedDomains: [
        'replicate.delivery',
        'replicate.com', 
        'storage.googleapis.com',
        'blob.vercel-storage.com'
      ],
      timeout: "30 seconds"
    }
  })
}