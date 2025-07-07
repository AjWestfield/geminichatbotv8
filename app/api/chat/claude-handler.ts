import { getClaudeClient } from '@/lib/claude-client';
import { handleClaudeStreaming } from '@/lib/claude-streaming-handler';
import { MCPToolsContext } from '@/lib/mcp/mcp-tools-context';
import { MCP_SYSTEM_PROMPT_ENHANCED, MCP_AGENT_INSTRUCTIONS_ENHANCED } from '@/lib/mcp/mcp-agent-instructions-enhanced';
import { VideoGenerationHandler } from '@/lib/video-generation-handler';

export async function handleClaudeRequest(
  messages: any[],
  fileUri?: string,
  fileMimeType?: string,
  multipleFiles?: any[]
) {
  try {
    console.log('[Claude Handler] Processing request for Claude Sonnet 4');
    console.log('[Claude Handler] Messages count:', messages.length);
    
    // Check if files are being sent for analysis
    if (fileUri || (multipleFiles && multipleFiles.length > 0)) {
      // Check if any files are videos
      const hasVideoFiles = multipleFiles?.some(file => file.mimeType?.startsWith('video/')) || 
                           fileMimeType?.startsWith('video/');
      
      if (hasVideoFiles) {
        console.log('[Claude Handler] Video file detected - Claude Sonnet 4 cannot analyze videos');
        
        const errorMessage = "Claude Sonnet 4 cannot analyze video files. Please use one of the Gemini models (gemini-2.0-flash, gemini-2.5-flash-preview-05-20, or gemini-2.5-pro-preview-06-05) for video analysis and reverse engineering.";
        
        // Return error in streaming format
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`0:${JSON.stringify(errorMessage)}\n`));
            controller.enqueue(encoder.encode(`d:{"finishReason":"stop"}\n`));
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
      
      // Log audio files (which are allowed)
      const hasAudioFiles = multipleFiles?.some(file => file.mimeType?.startsWith('audio/')) || 
                           fileMimeType?.startsWith('audio/');
      if (hasAudioFiles) {
        console.log('[Claude Handler] Audio file detected - Claude Sonnet 4 can analyze audio files');
      }
    }
    
    // Get Claude client
    const claudeClient = getClaudeClient();
    
    // Get available MCP tools
    const toolsContext = await MCPToolsContext.getAvailableTools();
    console.log('[Claude Handler] Available tools:', toolsContext.tools.length);
    
    // Get the last message to check for video generation request
    const lastMessage = messages[messages.length - 1];
    
    // Build system prompt - start with base instructions
    let systemPrompt = MCP_AGENT_INSTRUCTIONS_ENHANCED;
    
    // Check if this is a video generation request
    if (lastMessage && lastMessage.role === 'user') {
      const videoRequest = VideoGenerationHandler.detectVideoRequest(lastMessage.content);
      if (videoRequest) {
        console.log('[Claude Handler] Detected video generation request:', videoRequest);
        // Note: The actual video generation will be handled by the streaming handler
        // which will detect the VIDEO_GENERATION_TRIGGER in the response
      }
      
      // Check if message contains only social media URLs without publishing intent
      const socialMediaUrlPattern = /https?:\/\/(www\.)?(instagram|youtube|youtu\.be|tiktok|facebook|twitter|x\.com)[^\s]*/gi;
      const messageWithoutUrls = lastMessage.content.replace(socialMediaUrlPattern, '').trim();
      
      // If message is just URLs or URLs with minimal text, it's likely for download/analysis
      if (messageWithoutUrls.length < 50 && !messageWithoutUrls.match(/\b(post|publish|share|upload)\b/i)) {
        console.log('[Claude Handler] Detected social media URL(s) without publishing intent - download/analysis mode');
      }
    }
    
    // Handle the streaming response
    console.log('[Claude Handler] Initiating streaming response with Claude Sonnet 4');
    return handleClaudeStreaming(
      claudeClient,
      messages,
      systemPrompt,
      toolsContext
    );
  } catch (error) {
    console.error('[Claude Handler] Error:', error);
    throw error;
  }
}
