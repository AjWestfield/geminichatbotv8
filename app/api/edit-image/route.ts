import { NextRequest, NextResponse } from "next/server"
import { smartEditWithGPTImage1, checkGPTImage1Available } from "@/lib/openai-image-client"
import { ReplicateImageClient } from "@/lib/replicate-client"
import { ensureImageUrlAccessible, isReplicateDeliveryUrl, validateImageUrl, isVercelBlobUrl, downloadImageAsDataUrl } from "@/lib/image-url-validator"
import { getImageByLocalId } from "@/lib/services/chat-persistence"
import { uploadImageToBlob } from "@/lib/storage/blob-storage"
import { ensurePermanentImageStorage } from "@/lib/storage/permanent-image-storage"
import { generateImageId } from "@/lib/image-utils"

export async function POST(req: NextRequest) {
  console.log("Image editing API called")

  try {
    // Parse request body
    const body = await req.json()
    console.log("Request body:", body)

    // Define supported models type
    type SupportedModel = "gpt-image-1" | "flux-kontext-pro" | "flux-kontext-max";
    
    const {
      imageUrl,
      imageId, // Optional local image ID for database lookup
      prompt,
      model = "flux-kontext-pro" as SupportedModel,
      quality = "standard",
      style = "vivid",
      size = "1024x1024",
      mask, // Optional mask for inpainting
    }: {
      imageUrl: string;
      imageId?: string;
      prompt: string;
      model?: SupportedModel;
      quality?: string;
      style?: string;
      size?: string;
      mask?: string;
    } = body
    
    console.log("[API] Image editing request received:")
    console.log("[API] Model:", model)
    console.log("[API] Model type check:", {
      isGptImage1: model === "gpt-image-1",
      isFluxKontextMax: model === "flux-kontext-max", 
      isFluxKontextPro: model === "flux-kontext-pro",
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasReplicateKey: !!process.env.REPLICATE_API_KEY
    })

    // Check if required API keys are configured based on model
    if (model === "gpt-image-1" && !process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not configured for GPT-Image-1")
      return NextResponse.json(
        {
          error: "OpenAI API key not configured",
          details: "Please add OPENAI_API_KEY to your .env.local file. Get your API key from https://platform.openai.com/api-keys"
        },
        { status: 500 }
      )
    }
    
    if ((model === "flux-kontext-max" || model === "flux-kontext-pro") && !process.env.REPLICATE_API_KEY) {
      console.error("REPLICATE_API_KEY not configured for", model)
      return NextResponse.json(
        {
          error: "Replicate API key not configured",
          details: "Please add REPLICATE_API_KEY to your .env.local file."
        },
        { status: 500 }
      )
    }

    // Convert quality parameter from standard/hd to GPT-Image-1's low/medium/high
    let gptQuality: 'low' | 'medium' | 'high' = 'medium';
    if (quality === 'standard') {
      gptQuality = 'medium';
    } else if (quality === 'hd') {
      gptQuality = 'high';
    }
    
    // Log which model will be used
    console.log(`[API] Will use model: ${model}`);
    const modelCapabilities: Record<string, string> = {
      'gpt-image-1': 'Multimodal editing with inpainting support',
      'flux-kontext-pro': 'Fast text-based editing (~4-6s)',
      'flux-kontext-max': 'Premium quality with typography (~6-10s)'
    };
    console.log(`[API] Model capabilities:`, modelCapabilities[model as string] || 'Unknown model');

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      )
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Edit prompt is required" },
        { status: 400 }
      )
    }

    // Validate and map sizes for GPT-Image-1
    const validSizes = ['1024x1024', '1536x1024', '1024x1536'];
    let actualSize = size;
    
    // Map common sizes to GPT-Image-1 compatible sizes
    if (size === '1792x1024') {
      actualSize = '1536x1024'; // Closest landscape size
      console.log(`Mapping ${size} to ${actualSize} for GPT-Image-1`);
    } else if (size === '1024x1536') {
      actualSize = '1024x1536'; // Closest portrait size
      console.log(`Mapping ${size} to ${actualSize} for GPT-Image-1`);
    } else if (!validSizes.includes(size)) {
      actualSize = '1024x1024'; // Default to square
      console.log(`Invalid size ${size} for GPT-Image-1, using default: ${actualSize}`);
    }

    if (model === "gpt-image-1") {
      console.log(`Editing image with GPT-Image-1: "${prompt.substring(0, 50)}..."`)
    } else {
      console.log(`Editing image with ${model}: "${prompt.substring(0, 50)}..."`)
    }
    console.log(`Original image: ${imageUrl.substring(0, 50)}...`)
    console.log(`Quality: ${gptQuality} (from ${quality}), Style: ${style}, Size: ${actualSize} (requested: ${size})`)
    if (mask) {
      console.log(`Using mask for inpainting: ${mask.substring(0, 50)}...`)
    }

    try {
      if (model === "gpt-image-1") {
        // Convert Gemini file URI to a format OpenAI can access
        let processedImageUrl = imageUrl;

        // Check if this is a Gemini file URI (but not a data URL)
        if (!imageUrl.startsWith('data:') && (imageUrl.includes('generativelanguage.googleapis.com') || imageUrl.includes('files/'))) {
          console.log('Detected Gemini file URI - editing not supported');

          return NextResponse.json(
            {
              error: "Image editing not available for Gemini file URIs",
              details: "Gemini file URIs cannot be accessed by external services. Please upload the image again or use a generated image.",
              suggestion: "Try uploading the image file directly instead of using a Gemini URI"
            },
            { status: 400 }
          );
        }

        // Edit image using GPT-Image-1
        const result = await smartEditWithGPTImage1(processedImageUrl, prompt, {
          size: actualSize as '1024x1024' | '1536x1024' | '1024x1536',
          quality: gptQuality,
          style: style as 'vivid' | 'natural',
          mask,
        })

        console.log(`Successfully edited image using ${result.model || 'GPT-Image-1'}`)

        return NextResponse.json({
          success: true,
          images: [{
            url: result.imageUrl,
            originalUrl: result.originalImageUrl || imageUrl,
            revisedPrompt: result.revisedPrompt || prompt,
            index: 0,
          }],
          metadata: {
            model: result.model || 'gpt-image-1',
            provider: "openai",
            quality: quality, // Return original quality parameter
            style,
            size,
            originalPrompt: prompt,
            editMode: true,
            method: result.method || 'image-to-image',
            imageCount: 1,
            note: result.model?.includes('fallback') ? 'Using fallback model due to GPT-Image-1 availability' : undefined,
          }
        })
      } else if (model === "flux-kontext-max" || model === "flux-kontext-pro") {
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
        
        // Validate and ensure image URL is accessible for Replicate
        console.log(`[API] Validating image URL for Replicate: ${imageUrl}`)
        let validImageUrl = imageUrl
        
        // Use permanent storage mechanism to ensure URL is accessible
        try {
          validImageUrl = await ensurePermanentImageStorage(imageUrl, {
            imageId: imageId,
            filename: `edit_${generateImageId()}_${Date.now()}.png`,
            forceReupload: false
          })
          console.log(`[API] Image URL validated/recovered successfully`)
        } catch (error: any) {
          console.error(`[API] Failed to ensure permanent image storage:`, error)
          
          // Provide helpful error message based on URL type
          const isReplicateUrl = imageUrl.includes('replicate.delivery')
          const isVercelBlob = isVercelBlobUrl(imageUrl)
          
          return NextResponse.json(
            {
              error: "Image URL inaccessible",
              details: error.message || "Failed to access the image URL",
              suggestion: isVercelBlob 
                ? "The Vercel Blob Storage URL is no longer accessible. Please upload the image file directly to continue editing."
                : isReplicateUrl
                ? "The Replicate URL has expired. Please upload the image file directly to continue editing."
                : "The image URL is no longer accessible. Please upload the image file directly to continue editing.",
              technicalInfo: {
                originalUrl: imageUrl?.substring(0, 100) + '...',
                errorType: "url_inaccessible",
                provider: isReplicateUrl ? "replicate" : (isVercelBlob ? "vercel_blob" : "unknown")
              }
            },
            { status: 400 }
          )
        }
        
        const replicateClient = new ReplicateImageClient(process.env.REPLICATE_API_KEY)
        
        // Flux Kontext models require specific parameters
        const editInput = {
          prompt: prompt,
          input_image: validImageUrl,
          aspect_ratio: "match_input_image", // Always preserve original aspect ratio for edits
          output_format: "png" as const, // Replicate only supports "jpg" or "png"
          safety_tolerance: 2, // Max allowed when using input images
        }
        
        console.log(`[API] Calling Replicate ${model} with input:`, {
          ...editInput,
          input_image: editInput.input_image.substring(0, 50) + '...' // Truncate for logging
        })
        
        const editedImageUrl = await replicateClient.editImage(model, editInput)
        
        // Ensure editedImageUrl is a string (defensive programming)
        const editedImageUrlString = typeof editedImageUrl === 'string' 
          ? editedImageUrl 
          : (editedImageUrl as any)?.href || String(editedImageUrl);
        
        // Auto-upload edited Replicate images to permanent storage
        let permanentUrl = editedImageUrlString
        if (editedImageUrlString.includes('replicate.delivery')) {
          console.log('[API] Auto-uploading edited Replicate image to blob storage')
          const imageId = generateImageId()
          const filename = `edited_${imageId}.png`
          
          try {
            permanentUrl = await uploadImageToBlob(editedImageUrlString, filename)
            console.log('[API] Successfully uploaded edited image to blob:', permanentUrl)
          } catch (uploadError) {
            console.error('[API] Failed to upload edited image to blob storage:', uploadError)
            // Continue with original URL if upload fails
          }
        }
        
        return NextResponse.json({
          success: true,
          images: [{
            url: permanentUrl,
            originalUrl: imageUrl,
            editedUrl: editedImageUrlString, // Keep original edited URL for reference
            revisedPrompt: prompt,
            index: 0,
          }],
          metadata: {
            model,
            provider: "replicate",
            quality,
            style,
            size,
            originalPrompt: prompt,
            editMode: true,
            method: 'image-to-image',
            imageCount: 1,
            blobUploaded: permanentUrl !== editedImageUrlString,
          }
        })
      } else {
        return NextResponse.json(
          {
            error: "Invalid model specified",
            details: `The model "${model}" is not supported for image editing.`
          },
          { status: 400 }
        )
      }
    } catch (error: any) {
      console.error("Image editing error:", error)
      console.error("Error stack:", error.stack)
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        type: error.type,
        status: error.status,
        model: model,
        imageUrl: imageUrl?.substring(0, 100) + '...',
        hasImageId: !!imageId
      })

      // Enhanced error logging for diagnostics
      if (error.response) {
        console.error("API Response error:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        })
      }

      if (error.message?.includes('invalid_request_error')) {
        return NextResponse.json(
          {
            error: "Invalid request",
            details: "The request format or parameters are invalid. " + error.message,
            technicalInfo: { model, errorCode: error.code }
          },
          { status: 400 }
        )
      }

      if (error.message?.includes('rate_limit_exceeded')) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            details: "Too many requests. Please wait a moment and try again.",
            retryAfter: error.retryAfter || 60
          },
          { status: 429 }
        )
      }

      // Handle Replicate URL 404 errors
      if (error.message?.includes('404 Client Error') || error.message?.includes('404 Not Found')) {
        const isReplicateUrl = imageUrl?.includes('replicate.delivery')
        const isVercelBlob = imageUrl ? isVercelBlobUrl(imageUrl) : false
        const hasTmpInUrl = imageUrl?.includes('tmp')
        
        console.error("404 Error detected:", {
          isReplicateUrl,
          isVercelBlob,
          hasImageId: !!imageId,
          hasTmpInUrl,
          urlPattern: imageUrl?.match(/replicate\.delivery\/(\w+)\//)?.slice(0, 2)
        })
        
        let errorDetails = "The image URL is no longer accessible."
        let suggestion = "To edit this image, please:\n1. Save it to your device first\n2. Upload it again using the image upload button\n3. Then apply your edits"
        
        if (isReplicateUrl) {
          errorDetails = hasTmpInUrl 
            ? "This Replicate image is no longer available. The image appears to be a temporary file that was cleaned up. Please regenerate the image or save it locally before editing."
            : "This Replicate image is no longer available. While Replicate URLs typically last 24 hours, this one appears to have been removed earlier. Please regenerate the image or save it locally before editing."
        } else if (isVercelBlob) {
          errorDetails = "This Vercel Blob Storage URL is no longer accessible. The image may have been deleted or expired."
          suggestion = "To continue editing:\n1. If you have the original image saved, upload it again\n2. Or regenerate the image from the original prompt\n3. Consider saving important images locally to avoid this issue"
        }
        
        return NextResponse.json(
          {
            error: "Image no longer available",
            details: errorDetails,
            suggestion: suggestion,
            technicalInfo: {
              originalUrl: imageUrl?.substring(0, 100) + '...',
              errorType: "url_not_found",
              provider: isReplicateUrl ? "replicate" : (isVercelBlob ? "vercel_blob" : "unknown")
            }
          },
          { status: 400 }
        )
      }

      // Handle network/connection errors
      if (error.code === 'network_error' || 
          error.cause?.code === 'ECONNRESET' || 
          error.cause?.code === 'ETIMEDOUT' ||
          error.message?.includes('Network connection failed')) {
        return NextResponse.json(
          {
            error: "Network connection error",
            details: "The connection was interrupted while editing the image. This can happen with large images or slow connections.",
            suggestion: "Please try again. If the issue persists:\n1. Try using a smaller image\n2. Check your internet connection\n3. Try again in a few moments",
            technicalInfo: {
              errorCode: error.cause?.code || 'network_error',
              model: model,
              imageSize: imageUrl?.length || 0
            }
          },
          { status: 503 } // Service Unavailable
        )
      }

      // Handle validation/recovery errors from ensureImageUrlAccessible
      if (error.message?.includes('expired') || error.message?.includes('accessible')) {
        return NextResponse.json(
          {
            error: "Image URL inaccessible",
            details: error.message,
            suggestion: "Please upload the image file directly to continue editing."
          },
          { status: 400 }
        )
      }

      if (error.message?.includes('safety system') || error.code === 'moderation_blocked' || error.type === 'image_generation_user_error') {
        return NextResponse.json(
          {
            error: "Content not allowed",
            details: "The image or edit request was rejected by the AI's safety system. Try using different wording or editing a different image.",
            errorCode: error.code || 'safety_blocked'
          },
          { status: 400 }
        )
      }

      if (error.message?.includes('model_not_found')) {
        return NextResponse.json(
          {
            error: "Model not available",
            details: `The ${model} model is not available. Please check your API configuration.`,
            model: model
          },
          { status: 400 }
        )
      }

      // Generic error with more context
      return NextResponse.json(
        {
          error: "Failed to edit image",
          details: error.message || "An unexpected error occurred",
          suggestion: "If this persists, try uploading the image file directly.",
          errorInfo: {
            type: error.type || "unknown",
            code: error.code || "unknown",
            model: model
          }
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error("General error:", error)
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error.message || "Unknown error"
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Check if GPT-Image-1 is available
    const isAvailable = await checkGPTImage1Available();

    return NextResponse.json({
      status: "ok",
      message: "GPT-Image-1 editing API is accessible",
      provider: "openai",
      model: "gpt-image-1",
      available: isAvailable,
      capabilities: {
        features: [
          "Native Multimodal Image Generation",
          "Advanced Image-to-Image Editing",
          "Inpainting with Alpha Channel Masks",
          "Multi-Image Composition (up to 10 images)",
          "Conversational Editing with Context",
          "Accurate Text Rendering in Images"
        ],
        sizes: ["1024x1024", "1536x1024", "1024x1536"],
        quality: ["low", "medium", "high"],
        style: ["vivid", "natural"],
        mode: "multimodal",
        description: "GPT-Image-1 is GPT-4o's native image generation capability with advanced multimodal features"
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      message: "GPT-Image-1 API not configured or accessible",
      error: error.message
    }, { status: 500 })
  }
}

// Runtime configuration for Vercel
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds timeout
