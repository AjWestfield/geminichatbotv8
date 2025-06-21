import { GoogleGenerativeAI } from "@google/generative-ai"
import { ImageGenerationHandler } from "@/lib/image-generation-handler"
import { VideoGenerationHandler } from "@/lib/video-generation-handler"
import { SearchIntentDetector } from "@/lib/search-intent-detector"
import { PerplexityClient } from "@/lib/perplexity-client"
import {
  containsTTSCommand,
  containsMultiSpeakerTTSCommand,
  extractTTSContent
} from "@/lib/wavespeed-tts-handler"

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

/**
 * Safe stream writer utility
 * Checks if controller is closed before writing to prevent errors
 */
function safeEnqueue(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  data: string,
  context?: string
): boolean {
  try {
    // Check if controller is already closed
    if (controller.desiredSize === null) {
      console.warn(`[Chat API] Stream controller already closed${context ? ` at ${context}` : ''}`);
      return false;
    }
    
    controller.enqueue(encoder.encode(data));
    return true;
  } catch (error) {
    console.error(`[Chat API] Failed to write to stream${context ? ` at ${context}` : ''}:`, error);
    return false;
  }
}

/**
 * Helper function to check if a message is a reverse engineering analysis request
 * This prevents the image/video generation handlers from incorrectly processing analysis requests
 */
function isReverseEngineeringRequest(message: string): boolean {
  const reverseEngineeringPatterns = [
    // Image reverse engineering patterns
    /Reverse Engineering Analysis for Images:/i,
    /\*\*Reverse Engineering Analysis\*\*/i,
    /AI Model Detection.*Identify the likely AI model/i,
    /analyze.*uploaded.*files.*reverse.*engineering/i,
    /Please provide a detailed analysis of the uploaded files:/i,

    // Video reverse engineering patterns
    /Reverse Engineering Analysis for Videos:/i,
    /reverse.*engineer.*this.*video/i,
    /analyze.*video.*content.*reverse.*engineering/i,
    /provide.*detailed.*analysis.*video.*reverse/i,
    /recreate.*similar.*video.*content/i,
    /video.*generation.*technique.*analysis/i,
    /🔄.*reverse.*engineer/i,

    // General reverse engineering patterns
    /reverse.*engineer/i,
    /recreate.*this.*content/i,
    /analyze.*creation.*process/i,
    /breakdown.*production.*technique/i
  ]

  return reverseEngineeringPatterns.some(pattern => pattern.test(message))
}

export async function POST(req: Request) {
  try {
    // Parse request
    const {
      messages,
      model = "gemini-2.0-flash",
      fileUri,
      fileMimeType,
      multipleFiles,
      imageSettings
    } = await req.json()

    console.log(`[Chat API] Request received with model: ${model}`)
    console.log(`[Chat API] File URI: ${fileUri}, MIME type: ${fileMimeType}`)
    console.log(`[Chat API] Multiple files: ${multipleFiles?.length || 0}`)
    console.log(`[Chat API] Image settings:`, imageSettings)

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 })
    }

    // Get the last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()
    const messageContent = lastUserMessage?.content || ''

    // Check for web search intent
    let searchResults: any = null
    let searchCitations: string[] = []
    let searchError: string | null = null
    let needsWebSearch = false
    let webSearchQuery = ''

    // Skip search for Claude models as they have their own MCP-based search
    if (model !== "Claude Sonnet 4") {
      const detector = new SearchIntentDetector()
      const searchIntent = detector.detectSearchIntent(messageContent)

      // Check if the message contains [FORCE_WEB_SEARCH] marker (from follow-up questions)
      const forceSearch = messageContent.includes('[FORCE_WEB_SEARCH]')
      const cleanedMessage = messageContent.replace('[FORCE_WEB_SEARCH]', '').trim()

      if (searchIntent.needsSearch || forceSearch) {
        needsWebSearch = true
        webSearchQuery = forceSearch ? cleanedMessage : (searchIntent.searchQuery || messageContent)
        // Check if API key is available
        if (!process.env.PERPLEXITY_API_KEY) {
          console.log('[Chat API] Web search needed but PERPLEXITY_API_KEY not configured')
          searchError = 'Web search requires a Perplexity API key. Add PERPLEXITY_API_KEY to your .env.local file. Get one at https://www.perplexity.ai/settings/api'
        } else {
          console.log('[Chat API] Web search needed:', { searchIntent, forceSearch })
          // Search will be performed in the streaming response to show indicator first
        }
      }
    }

    // Check if it's a Claude model
    if (model === "Claude Sonnet 4") {
      console.log('[Chat API] Routing to Claude Sonnet 4 handler')
      try {
        const { handleClaudeRequest } = await import('./claude-handler')
        return handleClaudeRequest(messages)
      } catch (error) {
        console.error('[Chat API] Claude handler error:', error)
        return new Response("Claude handler not available", { status: 500 })
      }
    }

    // Check if this is a reverse engineering request FIRST
    const isReverseEngineering = isReverseEngineeringRequest(messageContent)
    if (isReverseEngineering) {
      console.log('[Chat API] Detected reverse engineering request - skipping all generation detection')
    }

    // Check for image generation request (skip if reverse engineering)
    const imageRequest = !isReverseEngineering ? ImageGenerationHandler.detectImageRequest(
      messageContent,
      imageSettings?.model
    ) : null

    let imageGenerationData: any = null
    let imageGenerationPrompt = ''

    if (imageRequest && !isReverseEngineering) {
      console.log('[Chat API] Detected image generation request:', imageRequest)

      // Apply user's image settings if not explicitly overridden in message
      if (imageSettings) {
        const lowerMessage = messageContent.toLowerCase()

        // Use settings size unless user explicitly mentions size in message
        if (!lowerMessage.includes('landscape') && !lowerMessage.includes('portrait') &&
            !lowerMessage.includes('square') && !lowerMessage.includes('wide') &&
            !lowerMessage.includes('tall') && !lowerMessage.includes('horizontal') &&
            !lowerMessage.includes('vertical')) {
          imageRequest.size = imageSettings.size
        }

        // Use settings style unless user explicitly mentions style in message
        if (!lowerMessage.includes('natural') && !lowerMessage.includes('realistic') &&
            !lowerMessage.includes('photorealistic') && !lowerMessage.includes('vivid')) {
          imageRequest.style = imageSettings.style
        }

        // Use settings quality unless user explicitly mentions quality in message
        if (!lowerMessage.includes('standard') && !lowerMessage.includes('hd') &&
            !lowerMessage.includes('high') && !lowerMessage.includes('quality')) {
          imageRequest.quality = imageSettings.quality
        }
      }

      try {
        // Check if required API key is configured
        const needsOpenAI = imageRequest.model === 'gpt-image-1'
        const needsReplicate = imageRequest.model === 'flux-kontext-pro' || imageRequest.model === 'flux-kontext-max'

        if ((needsOpenAI && !process.env.OPENAI_API_KEY) ||
            (needsReplicate && !process.env.REPLICATE_API_KEY)) {
          console.log('[Chat API] Missing required API key for image generation')
          // Continue without image generation
        } else {
          // Generate a placeholder ID for progress tracking
          const placeholderId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          console.log('[Chat API] Generated placeholder ID for progress tracking:', placeholderId)

          // Trigger actual image generation
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || '3000'}`
          const imageGenResponse = await fetch(`${baseUrl}/generate-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: imageRequest.prompt,
              originalPrompt: messageContent,
              model: imageRequest.model,
              quality: imageRequest.quality,
              style: imageRequest.style,
              size: imageRequest.size
            })
          })

          if (imageGenResponse.ok) {
            const result = await imageGenResponse.json()
            console.log('[Chat API] Image generation API response:', result)

            // Store image generation data to inject after AI response
            imageGenerationData = {
              success: true,
              images: result.images,
              metadata: result.metadata,
              prompt: imageRequest.prompt,
              placeholderId: placeholderId
            }
            imageGenerationPrompt = imageRequest.prompt
          } else {
            const errorText = await imageGenResponse.text()
            console.error('[Chat API] Image generation failed:', errorText)

            // Parse error message if possible
            let errorMessage = 'Failed to generate image'
            try {
              const errorObj = JSON.parse(errorText)
              errorMessage = errorObj.error || errorObj.details || errorMessage
            } catch {
              errorMessage = errorText || errorMessage
            }

            // Store error data to notify user
            imageGenerationData = {
              success: false,
              error: errorMessage,
              prompt: imageRequest.prompt,
              model: imageRequest.model,
              placeholderId: placeholderId
            }
          }
        }
      } catch (error) {
        console.error('[Chat API] Image generation error:', error)

        // Store error data to notify user
        imageGenerationData = {
          success: false,
          error: error instanceof Error ? error.message : 'Image generation failed unexpectedly',
          prompt: imageRequest.prompt,
          model: imageRequest.model,
          placeholderId: placeholderId
        }
      }
    }

    // Check for video generation request (skip if reverse engineering)
    let videoGenerationData: any = null
    const videoRequest = !isReverseEngineering ? await VideoGenerationHandler.detectVideoRequest(
      messageContent,
      fileUri,
      fileMimeType
    ) : null

    if (videoRequest && !isReverseEngineering) {
      console.log('[Chat API] Detected video generation request:', videoRequest)

      try {
        // Check if we have REPLICATE_API_KEY
        if (!process.env.REPLICATE_API_KEY) {
          console.log('[Chat API] Missing REPLICATE_API_KEY for video generation')
          // Continue without video generation - AI will provide instructions
        } else {
          // Determine the base URL
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || '3000'}`

          // Prepare video generation request
          const videoRequestBody: any = {
            prompt: videoRequest.prompt,
            duration: videoRequest.duration,
            aspectRatio: videoRequest.aspectRatio,
            model: videoRequest.model,
            negativePrompt: videoRequest.negativePrompt,
            backend: videoRequest.backend || 'replicate',
            tier: videoRequest.tier || 'fast'
          }

          // For image-to-video, add the image URL
          if (videoRequest.type === 'image-to-video' && videoRequest.imageUri) {
            videoRequestBody.startImage = videoRequest.imageUri
          }

          // Call video generation API
          const videoGenResponse = await fetch(`${baseUrl}/generate-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(videoRequestBody)
          })

          if (videoGenResponse.ok) {
            const result = await videoGenResponse.json()
            console.log('[Chat API] Video generation API response:', result)

            // Store video generation data to inject after AI response
            videoGenerationData = {
              id: result.id,
              url: result.output || '',
              status: result.status === 'succeeded' ? 'succeeded' : 'generating',
              prompt: videoRequest.prompt,
              duration: videoRequest.duration,
              aspectRatio: videoRequest.aspectRatio,
              model: videoRequest.model
            }

            if (videoRequest.type === 'image-to-video') {
              videoGenerationData.sourceImage = videoRequest.imageUri
            }
          } else {
            const error = await videoGenResponse.text()
            console.error('[Chat API] Video generation failed:', error)
          }
        }
      } catch (error) {
        console.error('[Chat API] Video generation error:', error)
      }
    }

    // Perform web search BEFORE building contentParts if needed
    if (needsWebSearch && !searchError && model !== "Claude Sonnet 4") {
      console.log('[Chat API] Performing web search BEFORE building contentParts')
      console.log('[Chat API] Current date/time:', new Date().toISOString())
      try {
        const perplexityClient = new PerplexityClient()
        const detector = new SearchIntentDetector()
        const searchIntent = detector.detectSearchIntent(messageContent)
        const forceSearch = messageContent.includes('[FORCE_WEB_SEARCH]')
        const cleanedMessage = messageContent.replace('[FORCE_WEB_SEARCH]', '').trim()

        // Prepare search options with enhanced temporal awareness
        const searchOptions: any = {
          search_mode: searchIntent.searchType === 'academic' ? 'academic' : 'web',
          return_images: true,
          return_related_questions: true
        }

        // Apply temporal filtering based on enhanced search intent
        if (searchIntent.timeFilter) {
          searchOptions.search_recency_filter = searchIntent.timeFilter
        } else if (searchIntent.temporalContext?.suggestedRecencyFilter &&
                   searchIntent.temporalContext.suggestedRecencyFilter !== 'none') {
          searchOptions.search_recency_filter = searchIntent.temporalContext.suggestedRecencyFilter
        }

        if (searchIntent.domainFilter) {
          searchOptions.search_domain_filter = searchIntent.domainFilter
        }

        // Create system message with enhanced temporal context
        const currentDate = new Date()
        const dateString = currentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })

        let temporalGuidance = ''
        if (searchIntent.temporalContext?.requiresFreshness) {
          temporalGuidance = '\nPrioritize the most recent information and clearly indicate when information was published or last updated.'
        } else if (searchIntent.temporalContext?.isHistoricalQuery) {
          temporalGuidance = '\nFocus on historical information as requested by the user.'
        } else {
          temporalGuidance = '\nProvide current information while noting the publication date when relevant.'
        }

        const systemMessage = {
          role: 'system' as const,
          content: `You are a helpful AI assistant with access to real-time web search.
Today's date is ${dateString}.
Current time: ${currentDate.toLocaleTimeString('en-US', { timeZoneName: 'short' })}.
${temporalGuidance}
Always provide the most current and up-to-date information based on search results.
Always cite your sources when using searched information.
Format citations as [Source Name](URL) when referencing search results.
When information might be time-sensitive, clearly indicate the publication date or last update time.`
        }

        // Use enhanced query if available for better temporal results
        const queryToUse = searchIntent.enhancedQuery || (forceSearch ? cleanedMessage : messageContent)

        console.log('[Chat API] Search query enhancement:', {
          original: messageContent,
          enhanced: searchIntent.enhancedQuery,
          using: queryToUse,
          temporalContext: searchIntent.temporalContext
        })

        // Perform the search with enhanced query
        const searchResponse = await perplexityClient.search(
          [
            systemMessage,
            { role: 'user' as const, content: queryToUse }
          ],
          searchOptions
        )

        console.log('[Chat API] Search completed:', {
          hasResults: !!searchResponse,
          citationsCount: searchResponse.citations?.length || 0,
          searchResultsCount: searchResponse.search_results?.length || 0
        })

        searchResults = searchResponse
        searchCitations = searchResponse.citations || []

        // Update the last user message to use cleaned content if force search
        if (forceSearch && lastUserMessage) {
          lastUserMessage.content = cleanedMessage
        }
      } catch (error: any) {
        console.error('[Chat API] Perplexity search error:', error)

        // Capture error details for user feedback
        if (error.response?.status === 401) {
          searchError = 'Invalid or missing Perplexity API key. Please check your PERPLEXITY_API_KEY in .env.local'
        } else if (error.response?.status === 429) {
          searchError = 'Perplexity API rate limit exceeded. Please try again later.'
        } else if (error.message?.includes('temporarily unavailable')) {
          searchError = error.message // Use the specific error message from PerplexityClient
        } else if (error.message?.includes('server error')) {
          searchError = error.message // Use the specific error message from PerplexityClient
        } else {
          searchError = 'Web search temporarily unavailable. Using cached knowledge instead.'
        }
      }
    }

    // Check for TTS generation request (skip if reverse engineering)
    let ttsGenerationData: any = null
    const hasTTSCommand = !isReverseEngineering ? containsTTSCommand(messageContent) : false
    const hasMultiSpeakerTTS = !isReverseEngineering ? containsMultiSpeakerTTSCommand(messageContent) : false

    if ((hasTTSCommand || hasMultiSpeakerTTS) && !isReverseEngineering) {
      console.log('[Chat API] Detected TTS request:', {
        hasTTSCommand,
        hasMultiSpeakerTTS,
        messagePreview: messageContent.substring(0, 100) + '...'
      })

      try {
        // Check if we have WAVESPEED_API_KEY
        if (!process.env.WAVESPEED_API_KEY) {
          console.log('[Chat API] Missing WAVESPEED_API_KEY for TTS generation')
          // Continue without TTS generation - AI will provide instructions
        } else {
          // Extract TTS content
          const ttsContent = extractTTSContent(messageContent)

          // Determine the base URL
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || '3000'}`

          // Call TTS generation API
          const ttsGenResponse = await fetch(`${baseUrl}/generate-speech`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: ttsContent.text,
              multiSpeaker: ttsContent.multiSpeaker,
              voice: ttsContent.voiceName,
              style: ttsContent.style
            })
          })

          if (ttsGenResponse.ok) {
            const result = await ttsGenResponse.json()
            console.log('[Chat API] TTS generation API response:', {
              success: result.success,
              speakers: result.metadata?.speakers,
              provider: result.metadata?.provider
            })

            // Store TTS generation data to inject after AI response
            ttsGenerationData = {
              success: result.success,
              audio: result.audio,
              mimeType: result.mimeType,
              script: result.script,
              metadata: {
                ...result.metadata,
                originalText: messageContent,
                isMultiSpeaker: ttsContent.multiSpeaker,
                timestamp: new Date().toISOString()
              }
            }
          } else {
            const error = await ttsGenResponse.text()
            console.error('[Chat API] TTS generation failed:', error)

            // Store error data to notify user
            ttsGenerationData = {
              success: false,
              error: error || 'TTS generation failed',
              originalText: messageContent
            }
          }
        }
      } catch (error) {
        console.error('[Chat API] TTS generation error:', error)

        // Store error data to notify user
        ttsGenerationData = {
          success: false,
          error: error instanceof Error ? error.message : 'TTS generation failed unexpectedly',
          originalText: messageContent
        }
      }
    }

    // Handle Gemini models
    if (model === "gemini-2.0-flash" || model === "gemini-2.5-flash-preview-05-20" || model === "gemini-2.5-pro-preview-06-05") {
      const chat = genAI.getGenerativeModel({ model: model })

      // Convert messages to Gemini format
      const contentParts = []

      // Add multiple files if provided
      if (multipleFiles && multipleFiles.length > 0) {
        console.log(`[Chat API] Processing ${multipleFiles.length} files`)
        for (const file of multipleFiles) {
          if (file.uri && file.mimeType) {
            console.log(`[Chat API] Adding file: ${file.name}, ${file.mimeType}`)
            contentParts.push({
              fileData: {
                mimeType: file.mimeType,
                fileUri: file.uri
              }
            })
          }
        }
      }
      // Add single file if provided (fallback for backward compatibility)
      else if (fileUri && fileMimeType) {
        console.log(`[Chat API] Processing single file: ${fileMimeType}, URI: ${fileUri}`)
        contentParts.push({
          fileData: {
            mimeType: fileMimeType,
            fileUri: fileUri
          }
        })
      }

      // If we have search results, add them to the context first
      if (searchResults && searchResults.choices?.[0]?.message?.content) {
        console.log('[Chat API] Adding search results to contentParts for Gemini')
        console.log('[Chat API] Search results preview:', searchResults.choices[0].message.content.substring(0, 200) + '...')

        const currentDate = new Date()
        const dateString = currentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          timeZone: 'America/Los_Angeles' // PST/PDT
        })
        const timeString = currentDate.toLocaleTimeString('en-US', { 
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short',
          timeZone: 'America/Los_Angeles'
        })

        // Add system message with date context and explicit instructions
        contentParts.push({
          text: `System: Today's date is ${dateString}. Current time is ${timeString}.
You have been provided with real-time web search results below.

CRITICAL INSTRUCTIONS:
1. You MUST base your entire response on the search results provided below
2. Do NOT use information from your training data when search results are available
3. Always cite the sources from the search results
4. If the search results mention dates, use those dates in your response
5. Your knowledge cutoff does not apply when using search results - trust the search data`
        })

        // Add search results
        const searchContent = searchResults.choices[0].message.content
        contentParts.push({
          text: `REAL-TIME WEB SEARCH RESULTS (USE THIS DATA):\n${searchContent}\n\nCitations: ${searchCitations.join(', ')}\n\nIMPORTANT: Base your entire response on the above search results. These are current, real-time results that supersede any training data.`
        })
      } else if (searchError) {
        // If search failed, add context about the error
        contentParts.push({
          text: `System: Web search encountered an error: ${searchError}\nPlease provide the best answer you can based on your training data, but mention that current information may differ.`
        })
      }

      // Then add message content
      for (const message of messages) {
        if (message.role === 'user') {
          if (typeof message.content === 'string') {
            contentParts.push({ text: message.content })
          } else if (Array.isArray(message.content)) {
            for (const part of message.content) {
              if (part.type === 'text') {
                contentParts.push({ text: part.text })
              } else if (part.type === 'image') {
                contentParts.push({
                  inlineData: {
                    mimeType: part.image.mimeType || 'image/jpeg',
                    data: part.image.data
                  }
                })
              }
            }
          }
        }
      }

      // Create streaming response
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send web search indicator if search was performed
            if (needsWebSearch) {
              const searchIndicator = `[WEB_SEARCH_STARTED]${JSON.stringify({
                query: webSearchQuery,
                hasResults: !!searchResults,
                hasError: !!searchError
              })}[/WEB_SEARCH_STARTED]`
              safeEnqueue(controller, encoder, `0:${JSON.stringify(searchIndicator)}\n`, 'web search indicator')
              
              // Send search completed indicator immediately after
              if (searchResults || searchError) {
                const searchMetadata = {
                  hasSearch: !!searchResults,
                  hasError: !!searchError,
                  error: searchError,
                  citations: searchCitations,
                  searchResults: searchResults?.search_results || [],
                  images: searchResults?.images || [],
                  relatedQuestions: searchResults?.related_questions || []
                }
                const searchDataMarker = `[WEB_SEARCH_COMPLETED]${JSON.stringify(searchMetadata)}[/WEB_SEARCH_COMPLETED]`
                safeEnqueue(controller, encoder, `0:${JSON.stringify(searchDataMarker)}\n`, 'search completed indicator')
              }
            }
            // Check if this is an image-only generation request (no other actions)
            if (imageGenerationData && !videoGenerationData) {
              console.log('[Chat API] Image generation only - using direct response without Gemini')

              // Send a progress start marker if we have a placeholder ID
              if (imageGenerationData.placeholderId) {
                const progressData = {
                  placeholderId: imageGenerationData.placeholderId,
                  prompt: imageRequest!.prompt,
                  model: imageRequest!.model,
                  quality: imageRequest!.quality,
                  style: imageRequest!.style,
                  size: imageRequest!.size
                }
                const progressMarker = `[IMAGE_GENERATION_STARTED]\n${JSON.stringify(progressData)}\n[/IMAGE_GENERATION_STARTED]`
                safeEnqueue(controller, encoder, `0:${JSON.stringify(progressMarker)}\n`, 'image generation start marker')
              }

              // Send the predetermined response for image generation
              const responseText = ImageGenerationHandler.generateResponse(imageRequest!)
              safeEnqueue(controller, encoder, `0:${JSON.stringify(responseText)}\n`, 'image generation response')

              // Inject the image generation data marker
              const imageDataMarker = `\n\n[IMAGE_GENERATION_COMPLETED]\n${JSON.stringify(imageGenerationData)}\n[/IMAGE_GENERATION_COMPLETED]`
              safeEnqueue(controller, encoder, `0:${JSON.stringify(imageDataMarker)}\n`, 'image generation marker')

              console.log('[Chat API] Sent image generation response without Gemini')
            }
            // For video generation or mixed requests, we still use Gemini
            else {
              // Get streaming response from Gemini
              const result = await chat.generateContentStream(contentParts)

              // If we detected a video request (and not reverse engineering), send the appropriate response first
              if (videoRequest && !isReverseEngineering) {
                const responseText = VideoGenerationHandler.generateResponse(videoRequest)
                safeEnqueue(controller, encoder, `0:${JSON.stringify(responseText)}\n`, 'video generation response')

                // Inject video generation data marker
                if (videoGenerationData) {
                  const videoDataMarker = `\n\n[VIDEO_GENERATION_STARTED]\n${JSON.stringify(videoGenerationData)}\n[/VIDEO_GENERATION_STARTED]`
                  safeEnqueue(controller, encoder, `0:${JSON.stringify(videoDataMarker)}\n`, 'video generation marker')
                }
              } else {
                // Process normal Gemini response
                for await (const chunk of result.stream) {
                  const text = chunk.text()
                  if (text) {
                    const escapedText = JSON.stringify(text)
                    if (!safeEnqueue(controller, encoder, `0:${escapedText}\n`, 'Gemini chunk')) {
                      // If we can't write anymore, break the loop
                      break
                    }
                  }
                }

                // Search metadata is now injected at the beginning of the stream

                // If we have image generation data, inject it
                if (imageGenerationData) {
                  // Send progress start marker first if we have a placeholder ID
                  if (imageGenerationData.placeholderId) {
                    const progressData = {
                      placeholderId: imageGenerationData.placeholderId,
                      prompt: imageRequest!.prompt,
                      model: imageRequest!.model,
                      quality: imageRequest!.quality,
                      style: imageRequest!.style,
                      size: imageRequest!.size
                    }
                    const progressMarker = `[IMAGE_GENERATION_STARTED]\n${JSON.stringify(progressData)}\n[/IMAGE_GENERATION_STARTED]`
                    safeEnqueue(controller, encoder, `0:${JSON.stringify(progressMarker)}\n`, 'image generation start marker')
                  }

                  const imageDataMarker = `\n\n[IMAGE_GENERATION_COMPLETED]\n${JSON.stringify(imageGenerationData)}\n[/IMAGE_GENERATION_COMPLETED]`
                  safeEnqueue(controller, encoder, `0:${JSON.stringify(imageDataMarker)}\n`, 'image generation marker')
                }

                // If we have TTS generation data, inject it
                if (ttsGenerationData) {
                  console.log('[Chat API] Injecting TTS metadata:', {
                    success: ttsGenerationData.success,
                    isMultiSpeaker: ttsGenerationData.metadata?.isMultiSpeaker,
                    speakers: ttsGenerationData.metadata?.speakers,
                    provider: ttsGenerationData.metadata?.provider
                  })
                  const ttsDataMarker = `\n\n[TTS_GENERATION_COMPLETED]\n${JSON.stringify(ttsGenerationData)}\n[/TTS_GENERATION_COMPLETED]`
                  safeEnqueue(controller, encoder, `0:${JSON.stringify(ttsDataMarker)}\n`, 'TTS metadata')
                }
              }
            }

            safeEnqueue(controller, encoder, `d:{"finishReason":"stop"}\n`, 'finish reason')
          } catch (error) {
            console.error("Streaming error:", error)
            const errorMessage = error instanceof Error ? error.message : "Unknown error"
            const escapedError = JSON.stringify(errorMessage)
            safeEnqueue(controller, encoder, `3:${escapedError}\n`, 'error message')
          } finally {
            try {
              controller.close()
            } catch (closeError) {
              console.warn('[Chat API] Controller already closed:', closeError)
            }
          }
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // For non-supported models
    return new Response(
      JSON.stringify({ error: "Unsupported model: " + model }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

  } catch (error) {
    console.error("Chat API Error:", error)

    // Return error in data stream format
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return new Response(
      `3:${JSON.stringify(errorMessage)}\n`,
      {
        status: 200, // Keep 200 for data stream compatibility
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        }
      }
    )
  }
}
