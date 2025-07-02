import { GoogleGenerativeAI } from "@google/generative-ai"
import { ImageGenerationHandler } from "@/lib/image-generation-handler"
import { VideoGenerationHandler } from "@/lib/video-generation-handler"
import { SearchIntentDetector } from "@/lib/search-intent-detector"
import { PerplexityClient } from "@/lib/perplexity-client"
import crypto from "crypto"
import {
  containsTTSCommand,
  containsMultiSpeakerTTSCommand,
  extractTTSContent
} from "@/lib/wavespeed-tts-handler"
import { MCPToolsContext } from "@/lib/mcp/mcp-tools-context"
import { countRequestTokens, truncateMessages, GEMINI_TOKEN_LIMITS } from "@/lib/token-counter"
import { GeminiFileValidator } from "@/lib/gemini-file-validator"

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
    
    // Video reverse engineering prompts from frontend
    /complete\s+audio\s+transcription\s+with\s+timestamps/i,
    /production\s+breakdown.*tools.*equipment.*techniques/i,
    /content\s+structure\s+(?:&|and)\s+script\s+analysis/i,
    /technical\s+recreation\s+guide/i,
    /design\s+decisions.*creative\s+choices/i,
    /creation\s+workflow.*step-by-step\s+process/i,
    
    // Reverse engineering markers
    /\[PROMPT\s+START\]/i,
    /\[PROMPT\s+END\]/i,
    /recreatable\s+prompt\s+generation/i,
    /prompt\s+engineering\s+reverse\s+analysis/i,

    // General reverse engineering patterns
    /reverse.*engineer/i,
    /recreate.*this.*content/i,
    /analyze.*creation.*process/i,
    /breakdown.*production.*technique/i,
    /how.*was.*this.*(?:made|created|generated)/i,
    /deconstruct.*(?:this|the).*(?:video|image|content)/i
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
      imageSettings,
      messageId = crypto.randomUUID()
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

    // Check for deep research mode - this should ONLY be triggered by the frontend
    // when the user has explicitly activated deep research mode via the toggle button
    const isDeepResearchMode = messageContent.startsWith('deep research on ');
    const deepResearchQuery = isDeepResearchMode
      ? messageContent.replace('deep research on ', '').trim()
      : '';

    if (isDeepResearchMode && deepResearchQuery) {
      console.log('[Chat API] Deep research mode detected - routing to Browser Use Agent:', deepResearchQuery);

      // Return a streaming response that indicates browser research is starting
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();

          // Send initial message
          controller.enqueue(encoder.encode('🔬 **Deep Research Mode Active**\n\n'));
          controller.enqueue(encoder.encode(`🎯 **Research Topic:** ${deepResearchQuery}\n\n`));
          controller.enqueue(encoder.encode('🤖 **Browser Use Agent Activated**\n\n'));
          controller.enqueue(encoder.encode('The AI agent is now:\n'));
          controller.enqueue(encoder.encode('- 🧠 Analyzing your research query with advanced AI\n'));
          controller.enqueue(encoder.encode('- 🔍 Planning autonomous research strategy\n'));
          controller.enqueue(encoder.encode('- 🌐 Opening browser session with vision capabilities\n'));
          controller.enqueue(encoder.encode('- 📊 Will intelligently navigate multiple sources\n'));
          controller.enqueue(encoder.encode('- 📝 Will extract and synthesize content comprehensively\n\n'));
          controller.enqueue(encoder.encode('💡 **Tip:** The Browser Use Agent can see and interact with web pages like a human!\n\n'));
          controller.enqueue(encoder.encode('---\n\n'));
          controller.enqueue(encoder.encode('*The browser agent will send detailed results as research progresses. Please wait...*\n'));

          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    // Check for web search intent - ONLY when NOT in deep research mode
    let searchResults: any = null
    let searchCitations: string[] = []
    let searchError: string | null = null
    let needsWebSearch = false
    let webSearchQuery = ''

    // Skip search for Claude models as they have their own MCP-based search
    // Also skip search if we're in deep research mode (handled by Browser Use Agent)
    if (model !== "Claude Sonnet 4" && !isDeepResearchMode) {
      console.log('[Chat API] Checking for Perplexity web search intent (not in deep research mode)')

      const detector = new SearchIntentDetector()
      const searchIntent = detector.detectSearchIntent(messageContent)

      // Check if the message contains [FORCE_WEB_SEARCH] marker (from follow-up questions)
      const forceSearch = messageContent.includes('[FORCE_WEB_SEARCH]')
      const cleanedMessage = messageContent.replace('[FORCE_WEB_SEARCH]', '').trim()

      if (searchIntent.needsSearch || forceSearch) {
        needsWebSearch = true
        webSearchQuery = forceSearch ? cleanedMessage : (searchIntent.searchQuery || messageContent)
        console.log('[Chat API] Perplexity web search needed:', { searchIntent, forceSearch, query: webSearchQuery })

        // Check if API key is available
        if (!process.env.PERPLEXITY_API_KEY) {
          console.log('[Chat API] Web search needed but PERPLEXITY_API_KEY not configured')
          searchError = 'Web search requires a Perplexity API key. Add PERPLEXITY_API_KEY to your .env.local file. Get one at https://www.perplexity.ai/settings/api'
        } else {
          console.log('[Chat API] Perplexity web search will be performed')
          // Search will be performed in the streaming response to show indicator first
        }
      }
    } else if (isDeepResearchMode) {
      console.log('[Chat API] Skipping Perplexity search - deep research mode active (using Browser Use Agent)')
    }

    // Check if it's a Claude model
    if (model === "Claude Sonnet 4") {
      console.log('[Chat API] Routing to Claude Sonnet 4 handler')
      try {
        const { handleClaudeRequest } = await import('./claude-handler')
        return handleClaudeRequest(messages, fileUri, fileMimeType, multipleFiles)
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
    let placeholderId: string | null = null

    if (imageRequest && !isReverseEngineering) {
      console.log('[Chat API] Detected image generation request:', imageRequest)

      // Generate a placeholder ID for progress tracking
      placeholderId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

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
          console.log('[Chat API] Generated placeholder ID for progress tracking:', placeholderId)

          // Trigger actual image generation
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || '3000'}`
          const imageGenResponse = await fetch(`${baseUrl}/api/generate-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: imageRequest.prompt,
              originalPrompt: messageContent,
              model: imageRequest.model,
              quality: imageRequest.quality,
              style: imageRequest.style,
              size: imageRequest.size
            }),
            // Add timeout slightly less than route timeout to allow for error handling
            signal: AbortSignal.timeout(55000) // 55 seconds
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
      } catch (error: any) {
        console.error('[Chat API] Image generation error:', error)

        // Determine appropriate error message based on error type
        let errorMessage = 'Image generation failed unexpectedly'
        let isTimeout = false
        
        if (error.name === 'AbortError' || error.message?.includes('timeout')) {
          errorMessage = 'Image generation timed out. This can happen with complex prompts or when the service is busy. Please try again.'
          isTimeout = true
        } else if (error.cause?.code === 'UND_ERR_SOCKET' || error.cause?.code === 'ECONNRESET') {
          errorMessage = 'Connection to image service was interrupted. Please try again.'
        } else if (error.message?.includes('fetch failed')) {
          errorMessage = 'Unable to connect to image generation service. Please check your connection and try again.'
        } else if (error instanceof Error) {
          errorMessage = error.message
        }

        // Store error data to notify user
        imageGenerationData = {
          success: false,
          error: errorMessage,
          prompt: imageRequest.prompt,
          model: imageRequest.model,
          placeholderId: placeholderId,
          isTimeout: isTimeout
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

          // Call video generation API with timeout
          const videoGenResponse = await fetch(`${baseUrl}/generate-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(videoRequestBody),
            // Add timeout for video generation
            signal: AbortSignal.timeout(55000) // 55 seconds
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
      } catch (error: any) {
        console.error('[Chat API] Video generation error:', error)
        
        // Determine error type and provide helpful message
        let errorMessage = 'Video generation failed'
        if (error.name === 'AbortError' || error.message?.includes('timeout')) {
          errorMessage = 'Video generation timed out. Video generation can take several minutes. Please try again.'
        } else if (error.cause?.code === 'UND_ERR_SOCKET' || error.cause?.code === 'ECONNRESET') {
          errorMessage = 'Connection to video service was interrupted. Please try again.'
        }
        
        // Store error in video generation data
        videoGenerationData = {
          id: `video_error_${Date.now()}`,
          status: 'failed',
          error: errorMessage,
          prompt: videoRequest?.prompt || '',
          model: videoRequest?.model || ''
        }
      }
    }

    // Perform Perplexity web search BEFORE building contentParts if needed
    // Only execute if NOT in deep research mode (Browser Use Agent handles research in that case)
    if (needsWebSearch && !searchError && model !== "Claude Sonnet 4" && !isDeepResearchMode) {
      console.log('[Chat API] Performing Perplexity web search BEFORE building contentParts')
      console.log('[Chat API] Current date/time:', new Date().toISOString())
      try {
        const perplexityClient = new PerplexityClient()
        const detector = new SearchIntentDetector()
        const searchIntent = detector.detectSearchIntent(messageContent)
        const forceSearch = messageContent.includes('[FORCE_WEB_SEARCH]')
        const cleanedMessage = messageContent.replace('[FORCE_WEB_SEARCH]', '').trim()

        // Prepare search options with enhanced temporal awareness
        const searchOptions: any = {
          search_mode: searchIntent.searchType && searchIntent.searchType.includes('academic') ? 'academic' : 'web',
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

    // Enhanced approval/rejection detection
    const { detectApprovalWithContext, logApprovalDetection } = await import('@/lib/approval-detection')
    const approvalResult = detectApprovalWithContext(messageContent, messages.slice(-5))
    const isApprovingTasks = approvalResult.isApprovingTasks && approvalResult.confidence > 0.6
    const isRejectingTasks = approvalResult.isRejectingTasks && approvalResult.confidence > 0.6

    logApprovalDetection(approvalResult, 'Chat API detection')

    // Check for agentic workflow requirements
    const requiresWorkflow = false // disabled orchestrator workflow

    // Handle approval/rejection for Claude Sonnet 4 (which uses MCP directly)
    if (model === "Claude Sonnet 4" && (isApprovingTasks || isRejectingTasks)) {
      console.log('[Chat API] Claude Sonnet 4 approval/rejection detected')

      // For Claude Sonnet 4, we need to handle approval/rejection differently
      // since it uses MCP TodoManager directly rather than the workflow system
      if (isRejectingTasks) {
        // Clear tasks and return rejection message
        const { useAgentTaskStore } = await import('@/lib/stores/agent-task-store')
        const { rejectTasks } = useAgentTaskStore.getState()
        rejectTasks()

        return new Response("Tasks cancelled. Please provide a new request.", {
          headers: { 'Content-Type': 'text/plain' }
        })
      } else if (isApprovingTasks) {
        // Approve tasks and let Claude Sonnet 4 proceed with execution
        const { useAgentTaskStore } = await import('@/lib/stores/agent-task-store')
        const { approveTasks } = useAgentTaskStore.getState()
        approveTasks()

        // Modify the message to indicate execution should begin
        const modifiedMessages = [...messages]
        modifiedMessages[modifiedMessages.length - 1] = {
          ...modifiedMessages[modifiedMessages.length - 1],
          content: "Execute the approved tasks. Begin execution phase of the approved task plan."
        }

        // Route to Claude handler with modified message
        try {
          const { handleClaudeRequest } = await import('./claude-handler')
          return handleClaudeRequest(modifiedMessages, fileUri, fileMimeType, multipleFiles)
        } catch (error) {
          console.error('[Chat API] Claude handler error:', error)
          return new Response("Claude handler not available", { status: 500 })
        }
      }
    }

    if (false) {
      console.log('[Chat API] Detected workflow requirement, using orchestrator')
      console.log('[Chat API] Workflow trigger details:', {
        requiresWorkflow,
        isApprovingTasks,
        isRejectingTasks,
        messageContent: messageContent.substring(0, 100) + '...'
      })

      try {
        // Create orchestrator with appropriate mode
        const orchestratorConfig: any = {
          enableMCPSync: true,
          enableUI: true
        }

        // If not approving tasks, use planning-only mode
        if (!isApprovingTasks && !isRejectingTasks) {
          orchestratorConfig.planOnly = true
        }

        // Create a new orchestrator instance with the config
        const { createOrchestrator } = await import('@/lib/workflows/orchestrator')
        const orchestrator = createOrchestrator(orchestratorConfig)

        // Create streaming response for workflow execution
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          async start(controller) {
            try {
              // Handle task rejection
              if (isRejectingTasks) {
                safeEnqueue(controller, encoder, `0:${JSON.stringify("Tasks cancelled. Please provide a new request.")}\n`, 'task rejection')
                safeEnqueue(controller, encoder, `d:{"finishReason":"stop"}\n`, 'workflow finish')
                return
              }

              // Handle task approval
              if (isApprovingTasks) {
                // Extract the original request from conversation history
                const previousUserMessage = messages.slice(0, -1).reverse().find((m: any) => m.role === 'user')
                const originalRequest = previousUserMessage?.content || messageContent

                safeEnqueue(controller, encoder, `0:${JSON.stringify("[WORKFLOW_APPROVED] Executing approved tasks...")}\n`, 'workflow approval')

                // Execute with full execution mode
                for await (const step of orchestrator.stream(originalRequest, {
                  configurable: { thread_id: `workflow_${Date.now()}` }
                })) {
                  const progressText = formatWorkflowProgress(step.result)
                  safeEnqueue(controller, encoder, `0:${JSON.stringify(progressText)}\n`, 'workflow progress')

                  if (step.result.status === 'completed' || step.result.status === 'failed') {
                    break
                  }
                }
              } else {
                // Planning mode - create tasks only
                safeEnqueue(controller, encoder, `0:${JSON.stringify("[WORKFLOW_PLANNING] Creating task plan...")}\n`, 'workflow planning')

                // Stream workflow planning
                for await (const step of orchestrator.stream(messageContent, {
                  configurable: { thread_id: `workflow_${Date.now()}` }
                })) {
                  const progressText = formatWorkflowProgress(step.result)
                  safeEnqueue(controller, encoder, `0:${JSON.stringify(progressText)}\n`, 'workflow progress')

                  if (step.result.status === 'completed' || step.result.status === 'failed') {
                    break
                  }
                }
              }

              safeEnqueue(controller, encoder, `d:{"finishReason":"stop"}\n`, 'workflow finish')
            } catch (error) {
              console.error('[Chat API] Workflow execution error:', error)
              const errorMessage = error instanceof Error ? error.message : "Workflow execution failed"
              safeEnqueue(controller, encoder, `3:${JSON.stringify(errorMessage)}\n`, 'workflow error')
            } finally {
              try {
                controller.close()
              } catch (closeError) {
                console.warn('[Chat API] Workflow controller already closed:', closeError)
              }
            }
          }
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        })
      } catch (error) {
        console.error('[Chat API] Workflow initialization failed:', error)
        // Fall through to normal Gemini handling
      }
    }

    // Handle Gemini models
    if (model === "gemini-2.0-flash" || model === "gemini-2.5-flash-preview-05-20" || model === "gemini-2.5-pro-preview-06-05") {
      console.log(`[Chat API] Using Gemini model: ${model}`)
      const chat = genAI.getGenerativeModel({ model: model })

      // Get available MCP tools
      const toolsContext = await MCPToolsContext.getAvailableTools()
      console.log('[Chat API] Available MCP tools for Gemini:', toolsContext.tools.length)

      // Check token count before proceeding
      const tokenLimit = GEMINI_TOKEN_LIMITS[model as keyof typeof GEMINI_TOKEN_LIMITS] || 200000
      const initialTokenCount = countRequestTokens(
        messages,
        toolsContext.systemPrompt,
        toolsContext.tools
      )

      console.log(`[Chat API] Token usage: ${initialTokenCount.total}/${tokenLimit} (${Math.round(initialTokenCount.total/tokenLimit*100)}%)`)

      // Truncate messages if needed
      let processedMessages = messages
      if (initialTokenCount.total > tokenLimit * 0.9) {
        console.warn(`[Chat API] Approaching token limit, truncating conversation...`)
        processedMessages = truncateMessages(
          messages,
          tokenLimit,
          initialTokenCount.systemPrompt,
          initialTokenCount.tools
        )
      }

      // Convert messages to Gemini format
      const contentParts: any[] = []

      // Add token warning if approaching limit
      if (initialTokenCount.total > tokenLimit * 0.8) {
        const percentUsed = Math.round(initialTokenCount.total/tokenLimit*100)
        contentParts.push({
          text: `[Token Warning: Using ${percentUsed}% of token limit. Consider starting a new chat if you experience issues.]\n`
        })
      }

      // Validate and add files
      let fileValidationError: string | null = null
      
      // Add multiple files if provided
      if (multipleFiles && multipleFiles.length > 0) {
        console.log(`[Chat API] Processing ${multipleFiles.length} files`)
        
        // Separate files that need validation from those that should skip
        const filesToValidate = multipleFiles.filter(f => !f.skipValidation)
        const filesToSkip = multipleFiles.filter(f => f.skipValidation)
        
        if (filesToSkip.length > 0) {
          console.log(`[Chat API] Skipping validation for ${filesToSkip.length} files (freshly downloaded)`)
          filesToSkip.forEach(file => {
            console.log(`[Chat API] - Skipping validation for: ${file.name}`)
          })
        }
        
        let validFiles = [...filesToSkip] // Start with files that skip validation
        let invalidFiles: any[] = []
        
        // Only validate files that don't have skipValidation flag
        if (filesToValidate.length > 0) {
          // Initialize file validator
          const fileValidator = new GeminiFileValidator(process.env.GEMINI_API_KEY || "")
          
          // Validate only files that need validation
          const validationResult = await fileValidator.validateFiles(filesToValidate)
          validFiles.push(...validationResult.validFiles)
          invalidFiles = validationResult.invalidFiles
        }
        
        if (invalidFiles.length > 0) {
          console.warn(`[Chat API] ${invalidFiles.length} files are invalid/expired:`)
          invalidFiles.forEach(file => {
            console.warn(`[Chat API] - ${file.name}: ${file.error}`)
          })
          
          // Create user-friendly error message
          const expiredFileNames = invalidFiles.map(f => f.name || 'Unnamed file').join(', ')
          fileValidationError = `The following files have expired and need to be re-uploaded: ${expiredFileNames}. Files uploaded to the AI expire after 48 hours.`
        }
        
        // Add valid files
        for (const file of validFiles) {
          console.log(`[Chat API] Adding validated file: ${file.name}, ${file.mimeType}`)
          contentParts.push({
            fileData: {
              mimeType: file.mimeType,
              fileUri: file.uri
            }
          })
        }
      }
      // Add single file if provided (fallback for backward compatibility)
      else if (fileUri && fileMimeType) {
        console.log(`[Chat API] Processing single file: ${fileMimeType}, URI: ${fileUri}`)
        
        // Initialize file validator
        const fileValidator = new GeminiFileValidator(process.env.GEMINI_API_KEY || "")
        
        // Validate the file
        const validation = await fileValidator.validateFile(fileUri)
        
        if (validation.isValid) {
          contentParts.push({
            fileData: {
              mimeType: fileMimeType,
              fileUri: fileUri
            }
          })
        } else {
          console.warn(`[Chat API] File is invalid/expired: ${validation.error}`)
          fileValidationError = `The uploaded file has expired and needs to be re-uploaded. Files expire after 48 hours.`
        }
      }

      // Add explicit instruction to NOT use TodoWrite
      contentParts.push({
        text: `IMPORTANT: Do NOT use TodoWrite, task lists, or any task management syntax in your responses. Simply respond directly to the user's request without creating task lists or planning steps.`
      })

      // Add VEO 3 reverse engineering instructions if this is a reverse engineering request
      if (isReverseEngineering) {
        console.log('[Chat API] Adding VEO 3 reverse engineering instructions')
        const { createVEO3AnalysisPrompt } = await import('@/lib/reverse-engineering-utils')
        const veo3Instructions = createVEO3AnalysisPrompt()
        
        contentParts.push({
          text: `CRITICAL REVERSE ENGINEERING INSTRUCTIONS:

${veo3Instructions}

FORMATTING REQUIREMENTS:
1. When analyzing videos, ALWAYS provide the complete VEO 3 prompt wrapped in [PROMPT START] and [PROMPT END] markers
2. The prompt should be a complete, copy-paste ready VEO 3 template
3. Fill in ALL sections with detailed analysis from the video
4. Ensure all timing is precise (00:00 - 00:08 format)
5. Include ALL observed audio elements with the "Audio:" prefix
6. The user should be able to copy the entire prompt and use it directly

Example format:
[PROMPT START]
//======================================================================
// VEO 3 MASTER PROMPT TEMPLATE (DETAILED CHARACTER & TIMING)
//======================================================================
[... complete filled template ...]
[PROMPT END]

Remember: VEO 3 ALWAYS generates 8-second clips in 16:9 landscape format.`
        })
      }

      // Add MCP tools system prompt if tools are available
      if (toolsContext.tools.length > 0) {
        contentParts.push({
          text: toolsContext.systemPrompt
        })
        console.log('[Chat API] Added MCP tools system prompt to Gemini context')
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
      for (const message of processedMessages) {
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
                const progressMarker = `[IMAGE_GENERATION_STARTED]${JSON.stringify(progressData)}[/IMAGE_GENERATION_STARTED]`
                safeEnqueue(controller, encoder, `0:${JSON.stringify(progressMarker)}\n`, 'image generation start marker')
              }

              // Send the predetermined response for image generation
              const responseText = ImageGenerationHandler.generateResponse(imageRequest!)
              safeEnqueue(controller, encoder, `0:${JSON.stringify(responseText)}\n`, 'image generation response')

              // Inject the image generation data marker
              const imageDataMarker = `\n\n[IMAGE_GENERATION_COMPLETED]${JSON.stringify(imageGenerationData)}[/IMAGE_GENERATION_COMPLETED]`
              safeEnqueue(controller, encoder, `0:${JSON.stringify(imageDataMarker)}\n`, 'image generation marker')

              console.log('[Chat API] Sent image generation response without Gemini')
            }
            // For video generation or mixed requests, we still use Gemini
            else {
              // Check if there were file validation errors
              if (fileValidationError) {
                console.warn('[Chat API] File validation error, sending error message')
                
                // Send error message to user
                const errorMessage = `⚠️ File Upload Error:\n\n${fileValidationError}\n\nPlease re-upload the file(s) and try again. This happens because uploaded files are only stored temporarily.`
                safeEnqueue(controller, encoder, `0:${JSON.stringify(errorMessage)}\n`, 'file validation error')
                
                // Close the stream
                controller.close()
                return
              }
              
              // Get streaming response from Gemini
              const result = await chat.generateContentStream(contentParts)

              // If we detected a video request (and not reverse engineering), send the appropriate response first
              if (videoRequest && !isReverseEngineering) {
                const responseText = VideoGenerationHandler.generateResponse(videoRequest)
                safeEnqueue(controller, encoder, `0:${JSON.stringify(responseText)}\n`, 'video generation response')

                // Inject video generation data marker
                if (videoGenerationData) {
                  const videoDataMarker = `\n\n[VIDEO_GENERATION_STARTED]${JSON.stringify(videoGenerationData)}[/VIDEO_GENERATION_STARTED]`
                  safeEnqueue(controller, encoder, `0:${JSON.stringify(videoDataMarker)}\n`, 'video generation marker')
                }
              } else {
                // Process normal Gemini response
                let fullResponse = ''
                for await (const chunk of result.stream) {
                  const text = chunk.text()
                  if (text) {
                    fullResponse += text
                    const escapedText = JSON.stringify(text)
                    if (!safeEnqueue(controller, encoder, `0:${escapedText}\n`, 'Gemini chunk')) {
                      // If we can't write anymore, break the loop
                      break
                    }
                  }
                }

                // Check for tool calls in the complete response
                if (toolsContext.tools.length > 0) {
                  const toolCall = MCPToolsContext.parseToolCall(fullResponse)
                  if (toolCall) {
                    console.log('[Chat API] Found tool call in Gemini response:', toolCall)
                    try {
                      const toolResult = await MCPToolsContext.executeToolCall(toolCall)
                      console.log('[Chat API] Tool execution result length:', toolResult.length)

                      // Send tool execution result
                      const toolResultMessage = `\n\n**Tool Execution: ${toolCall.server} - ${toolCall.tool}**\n\n${toolResult}\n\n🔍 **MANDATORY ANALYSIS SECTION**\nPlease analyze the above tool results and provide:\n1. Summary of what was found\n2. Key insights and important information  \n3. Direct answer to the user's question\n4. Recommendations or next steps`
                      safeEnqueue(controller, encoder, `0:${JSON.stringify(toolResultMessage)}\n`, 'tool execution result')
                    } catch (error) {
                      console.error('[Chat API] Tool execution error:', error)
                      const errorMessage = `\n\nTool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                      safeEnqueue(controller, encoder, `0:${JSON.stringify(errorMessage)}\n`, 'tool execution error')
                    }
                  }
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
                const progressMarker = `[IMAGE_GENERATION_STARTED]${JSON.stringify(progressData)}[/IMAGE_GENERATION_STARTED]`
                safeEnqueue(controller, encoder, `0:${JSON.stringify(progressMarker)}\n`, 'image generation start marker')
              }

              const imageDataMarker = `\n\n[IMAGE_GENERATION_COMPLETED]${JSON.stringify(imageGenerationData)}[/IMAGE_GENERATION_COMPLETED]`
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
              const ttsDataMarker = `\n\n[TTS_GENERATION_COMPLETED]${JSON.stringify(ttsGenerationData)}[/TTS_GENERATION_COMPLETED]`
              safeEnqueue(controller, encoder, `0:${JSON.stringify(ttsDataMarker)}\n`, 'TTS metadata')
            }

            safeEnqueue(controller, encoder, `d:{"finishReason":"stop"}\n`, 'finish reason')
          } catch (error) {
            console.error("Streaming error:", error)
            let errorMessage = error instanceof Error ? error.message : "Unknown error"
            
            // Check for specific Gemini file expiration error
            if (errorMessage.includes('File is not in an ACTIVE state') || 
                errorMessage.includes('File not found') ||
                errorMessage.includes('Invalid file')) {
              console.log('[Chat API] Detected expired file error')
              
              // Extract file ID if possible for better error message
              const fileIdMatch = errorMessage.match(/file[_-]?id:?\s*([a-zA-Z0-9_-]+)/i) || 
                                 errorMessage.match(/\b([a-z0-9]{10,})\b/)
              const fileId = fileIdMatch ? fileIdMatch[1] : 'unknown'
              
              // Provide helpful error message for expired files
              errorMessage = `The uploaded file has expired and is no longer available. This happens because files uploaded to Gemini expire after a period of time.\n\n` +
                           `To fix this:\n` +
                           `• If this was a YouTube/Instagram/TikTok video, paste the URL again to re-download it\n` +
                           `• If this was an uploaded file, please upload it again\n` +
                           `• Try to use uploaded files promptly after uploading\n\n` +
                           `Technical details: ${fileId ? `File ID: ${fileId}` : 'File expired'}`
            }
            
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
    let errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    // Check for specific Gemini file expiration error
    if (errorMessage.includes('File is not in an ACTIVE state') || 
        errorMessage.includes('File not found') ||
        errorMessage.includes('Invalid file')) {
      console.log('[Chat API] Detected expired file error in outer catch')
      
      // Provide helpful error message for expired files
      errorMessage = `The uploaded file has expired and is no longer available.\n\n` +
                   `To fix this:\n` +
                   `• If this was a YouTube/Instagram/TikTok video, paste the URL again to re-download it\n` +
                   `• If this was an uploaded file, please upload it again\n` +
                   `• Try to use uploaded files promptly after uploading`
    }
    
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

/**
 * Helper functions for agentic workflow integration
 */

/**
 * Detects if a message requires agentic workflow execution
 */
async function detectWorkflowRequirement(message: string): Promise<boolean> {
  const lowerMessage = message.toLowerCase()

  // First check for exclusions - requests that should NOT trigger workflows
  const excludePatterns = [
    // TTS and audio generation
    /create.*audio/i,
    /generate.*audio/i,
    /make.*audio/i,
    /\[S\d+\]/i, // Multi-speaker TTS format

    // Image generation
    /create.*image/i,
    /generate.*image/i,
    /make.*image/i,
    /draw.*image/i,

    // Video generation
    /create.*video/i,
    /generate.*video/i,
    /make.*video/i,

    // Simple content generation
    /create.*the.*audio/i,
    /create.*the.*image/i,
    /create.*the.*video/i,

    // Reverse engineering
    /reverse.*engineer/i,
    /analyze.*uploaded.*files/i,

    // Simple explanations
    /what.*is/i,
    /how.*does/i,
    /explain/i
  ]

  // Check for exclusions first
  const shouldExclude = excludePatterns.some(pattern => pattern.test(message))
  if (shouldExclude) {
    return false
  }

  // Patterns that indicate complex multi-step tasks
  const workflowPatterns = [
    // MCP server setup patterns
    /add.*mcp.*server/i,
    /setup.*mcp/i,
    /install.*server/i,
    /configure.*mcp/i,

    // Complex task patterns
    /step.*by.*step/i,
    /comprehensive.*analysis/i,
    /multi.*step/i,
    /systematic.*approach/i,

    // Content + research patterns
    /research.*and.*create/i,
    /find.*information.*then/i,
    /analyze.*then.*build/i,

    // Project setup patterns
    /set.*up.*project/i,
    /create.*environment/i,
    /build.*complete/i,

    // Task management specific patterns
    /create.*task/i,
    /add.*task/i,
    /task.*\d+/i,
    /following.*task/i,

    // Planning and organization
    /plan.*and.*execute/i,
    /organize.*and.*implement/i
  ]

  // Check for patterns
  const hasWorkflowPattern = workflowPatterns.some(pattern => pattern.test(message))

  // Check for length (longer requests often need workflows) - increased threshold
  const isLongRequest = message.split(' ').length > 25

  // Check for multiple workflow-specific actions (more specific than before)
  const workflowActionWords = ['setup', 'install', 'configure', 'analyze', 'research', 'plan', 'organize', 'implement', 'build']
  const actionCount = workflowActionWords.filter(word => lowerMessage.includes(word)).length
  const hasMultipleWorkflowActions = actionCount >= 2

  return hasWorkflowPattern || isLongRequest || hasMultipleWorkflowActions
}

/**
 * Formats workflow progress for streaming response
 */
function formatWorkflowProgress(result: any): string {
  if (!result) return "Workflow progress..."

  const statusEmoji = result.status === 'completed' ? '✅' :
                     result.status === 'failed' ? '❌' :
                     result.status === 'running' ? '🔄' : '⏳'

  let progressText = `${statusEmoji} **${result.type.toUpperCase()} Workflow**\\n\\n`

  if (result.steps && result.steps > 0) {
    progressText += `Progress: Step ${result.steps || 0}\\n`
  }

  if (result.finalMessage) {
    progressText += `\\n${result.finalMessage}\\n`
  }

  if (result.status === 'completed') {
    progressText += `\\n🎉 **Workflow completed successfully!**\\n`
    if (result.duration) {
      progressText += `⏱️ Completed in ${Math.round(result.duration / 1000)}s\\n`
    }
  } else if (result.status === 'failed') {
    progressText += `\\n💥 **Workflow failed:**\\n`
    if (result.error) {
      progressText += `Error: ${result.error}\\n`
    }
  }

  return progressText
}

// Runtime configuration for Vercel
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds timeout
