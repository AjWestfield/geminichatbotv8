import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface MultiImageSuggestionsRequest {
  images: string[] // Array of image URLs or data URLs
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
  console.log('[Multi-Image Suggestions API] Request received')

  try {
    const requestBody: MultiImageSuggestionsRequest = await req.json()
    const { images } = requestBody

    // Validate input
    if (!images || !Array.isArray(images) || images.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 images are required for suggestions' },
        { status: 400 }
      )
    }

    if (images.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 images allowed' },
        { status: 400 }
      )
    }

    console.log(`[Multi-Image Suggestions API] Processing ${images.length} images`)

    // Initialize Gemini model with vision capabilities
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    // Prepare content parts for Gemini
    const contentParts = []

    // Add instruction prompt
    contentParts.push({
      text: `You are an expert at analyzing images and creating prompts for AI image editing tools. 
      
I have provided ${images.length} images that the user wants to combine or edit together. 

CRITICAL REQUIREMENT: Each prompt MUST explicitly mention that ALL people/subjects from ALL ${images.length} images must be included in the final composition. Never leave anyone out.

Please analyze these images carefully and generate exactly 3 creative prompt suggestions that would help blend or combine these images seamlessly.

For each suggestion:
1. First, count and identify every person/subject in each image (e.g., "the man from image 1", "the woman from image 2", "the woman from image 3")
2. Explicitly state that ALL identified people must be included in the composition
3. Be specific about the visual elements from each image
4. Describe how the images should be combined or edited together
5. Include details about style, composition, lighting, or mood
6. Use descriptive language that references specific elements you see in each image

Format your response as a JSON array with exactly 3 suggestions like this:
[
  "Combine ALL ${images.length} people - [describe each person from each image] - into a single scene where [detailed description]...",
  "Create a composition featuring ALL subjects from the ${images.length} images - [list each person] - arranged in [detailed description]...",
  "Merge ALL ${images.length} individuals - [identify each person from each image] - into [detailed description]..."
]

Important guidelines:
- ALWAYS start by confirming ALL people from ALL images will be included
- Identify each person by their image number and appearance (e.g., "man in dark shirt from image 1", "woman in blue shirt from image 2")
- Never suggest compositions that would exclude any person from any image
- Each suggestion should explicitly list who is from which image
- Focus on creative ways to naturally include everyone together

Analyze the images and provide your 3 suggestions that include EVERY person:`
    })

    // Add images to the request
    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i]
      console.log(`[Multi-Image Suggestions API] Processing image ${i + 1}`)

      if (imageUrl.startsWith('data:')) {
        // Data URL - extract base64 data
        const matches = imageUrl.match(/^data:(.+);base64,(.+)$/)
        if (matches) {
          contentParts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2]
            }
          })
        } else {
          console.error(`[Multi-Image Suggestions API] Invalid data URL format for image ${i + 1}`)
          return NextResponse.json(
            { error: `Invalid data URL format for image ${i + 1}` },
            { status: 400 }
          )
        }
      } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        // External URL - fetch and convert to base64
        try {
          const response = await fetch(imageUrl)
          const blob = await response.blob()
          const buffer = await blob.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          
          contentParts.push({
            inlineData: {
              mimeType: blob.type,
              data: base64
            }
          })
        } catch (error) {
          console.error(`[Multi-Image Suggestions API] Failed to fetch image ${i + 1}:`, error)
          return NextResponse.json(
            { error: `Failed to fetch image ${i + 1}` },
            { status: 400 }
          )
        }
      } else if (imageUrl.startsWith('blob:')) {
        // Blob URLs cannot be fetched server-side
        return NextResponse.json(
          { error: 'Blob URLs must be converted to data URLs before sending' },
          { status: 400 }
        )
      } else {
        return NextResponse.json(
          { error: `Unsupported image URL format for image ${i + 1}` },
          { status: 400 }
        )
      }
    }

    // Generate content with Gemini
    console.log('[Multi-Image Suggestions API] Sending request to Gemini')
    const result = await model.generateContent(contentParts)
    const response = result.response
    const text = response.text()

    console.log('[Multi-Image Suggestions API] Gemini response:', text)

    // Parse the JSON response
    let suggestions: string[] = []
    try {
      // Extract JSON array from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0])
        
        // Validate we have exactly 3 suggestions
        if (!Array.isArray(suggestions) || suggestions.length !== 3) {
          throw new Error('Invalid number of suggestions returned')
        }
        
        // Ensure all suggestions are non-empty strings
        suggestions = suggestions.map(s => String(s).trim()).filter(s => s.length > 0)
        
        if (suggestions.length !== 3) {
          throw new Error('Some suggestions were empty')
        }
      } else {
        throw new Error('No JSON array found in response')
      }
    } catch (parseError) {
      console.error('[Multi-Image Suggestions API] Failed to parse suggestions:', parseError)
      
      // Fallback: Try to extract suggestions from text
      const lines = text.split('\n').filter(line => line.trim().length > 0)
      suggestions = lines.slice(0, 3).map(line => {
        // Remove numbering, quotes, and clean up
        return line.replace(/^\d+\.?\s*/, '').replace(/^["']|["']$/g, '').trim()
      }).filter(s => s.length > 20) // Filter out short/invalid suggestions
      
      // If we still don't have 3 valid suggestions, use defaults
      if (suggestions.length < 3) {
        console.log('[Multi-Image Suggestions API] Using fallback suggestions')
        suggestions = [
          `Combine ALL ${images.length} people from ALL images - include every single person from image 1, image 2, and image 3 - into a unified group portrait with natural lighting and seamless blending`,
          `Create a scene featuring ALL individuals from the ${images.length} images - ensuring the person from image 1, person from image 2, and person from image 3 are ALL present - arranged in an elegant composition`,
          `Merge ALL ${images.length} subjects together - making sure to include everyone from each image without exception - into a cohesive scene where they appear to be naturally interacting`
        ]
      }
    }

    console.log('[Multi-Image Suggestions API] Final suggestions:', suggestions)

    return NextResponse.json({
      success: true,
      suggestions,
      imageCount: images.length
    })

  } catch (error) {
    console.error('[Multi-Image Suggestions API] Error:', error)
    
    let errorMessage = 'Failed to generate suggestions'
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'API key configuration error'
        statusCode = 401
      } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
        errorMessage = 'Rate limit exceeded'
        statusCode = 429
      } else if (error.message.includes('SAFETY')) {
        errorMessage = 'Content blocked by safety filters'
        statusCode = 400
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}