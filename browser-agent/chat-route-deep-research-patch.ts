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
import { MCP_AGENT_TODO_WORKFLOW } from "@/lib/mcp/mcp-agent-todo-workflow"
import { MCPToolsContext } from "@/lib/mcp/mcp-tools-context"
import { defaultOrchestrator } from "@/lib/workflows/orchestrator"

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

    // Check for deep research mode
    const isDeepResearchMode = messageContent.startsWith('deep research on ');
    const deepResearchQuery = isDeepResearchMode
      ? messageContent.replace('deep research on ', '').trim()
      : '';

    if (isDeepResearchMode && deepResearchQuery) {
      console.log('[Chat API] Deep research mode detected:', deepResearchQuery);

      // Return a streaming response that indicates browser research is starting
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();

          // Send initial message
          safeEnqueue(
            controller,
            encoder,
            '🔬 **Deep Research Mode Active**\n\n',
            'deep research header'
          );

          safeEnqueue(
            controller,
            encoder,
            `🎯 **Research Topic:** ${deepResearchQuery}\n\n`,
            'research topic'
          );

          safeEnqueue(
            controller,
            encoder,
            '🌐 **Starting browser-based research with Claude Sonnet 4...**\n\n',
            'browser start'
          );

          safeEnqueue(
            controller,
            encoder,
            'The AI agent is now:\n',
            'status header'
          );

          safeEnqueue(
            controller,
            encoder,
            '- 🤖 Initializing browser automation with Claude Sonnet 4\n',
            'status 1'
          );

          safeEnqueue(
            controller,
            encoder,
            '- 🔍 Planning research strategy\n',
            'status 2'
          );

          safeEnqueue(
            controller,
            encoder,
            '- 🌐 Opening browser session\n',
            'status 3'
          );

          safeEnqueue(
            controller,
            encoder,
            '- 📊 Will visit multiple authoritative sources\n',
            'status 4'
          );

          safeEnqueue(
            controller,
            encoder,
            '- 📝 Will extract and analyze content comprehensively\n\n',
            'status 5'
          );

          safeEnqueue(
            controller,
            encoder,
            '💡 **Tip:** Click on the "Browser" tab in the Canvas view to watch the research in real-time!\n\n',
            'tip'
          );

          safeEnqueue(
            controller,
            encoder,
            '---\n\n',
            'separator'
          );

          // Placeholder for research results
          safeEnqueue(
            controller,
            encoder,
            '*Research in progress... Results will appear here once the browser agent completes its investigation.*\n\n',
            'placeholder'
          );

          safeEnqueue(
            controller,
            encoder,
            'For now, you can:\n',
            'instructions header'
          );

          safeEnqueue(
            controller,
            encoder,
            '1. Watch the live browser view to see pages being visited\n',
            'instruction 1'
          );

          safeEnqueue(
            controller,
            encoder,
            '2. Monitor the research progress in the agent panel\n',
            'instruction 2'
          );

          safeEnqueue(
            controller,
            encoder,
            '3. Export the research report when complete\n',
            'instruction 3'
          );

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

    // Check if this is a reverse engineering request FIRST
    const isReverseEngineering = isReverseEngineeringRequest(messageContent)
    if (isReverseEngineering) {
      console.log('[Chat API] Detected reverse engineering request - skipping all generation detection')
    }

    // Return a placeholder response for now
    return new Response("Deep research functionality is being implemented", { status: 501 })

  } catch (error) {
    console.error('[Chat API] Error:', error)
    return new Response("Internal server error", { status: 500 })
  }
}

// Helper function for safe enqueueing
function safeEnqueue(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  text: string,
  context: string
) {
  try {
    controller.enqueue(encoder.encode(text))
  } catch (error) {
    console.error(`[Chat API] Failed to enqueue ${context}:`, error)
  }
}
