import { useChat as useAiChat, type UseChatOptions, type Message } from "ai/react"
import { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { containsTTSCommand, extractTTSContent } from "@/lib/wavespeed-tts-handler"

interface MCPToolCall {
  id: string
  tool: string
  server: string
  status: 'executing' | 'completed' | 'failed'
  result?: unknown
  error?: string
  isExpanded: boolean
  timestamp: number
  duration?: number
}

interface MessageWithTools extends Message {
  toolCalls?: MCPToolCall[]
}

// Process messages to extract tool calls
function processMessagesWithTools(messages: Message[]): MessageWithTools[] {
  if (!messages || !Array.isArray(messages)) {
    console.warn('[processMessagesWithTools] Messages is undefined or not an array:', messages)
    return []
  }
  return messages.map(msg => {
    const toolCalls = parseToolCallsFromContent(msg.content)
    
    // Log tool call processing for debugging
    if (toolCalls.length > 0) {
      console.log('[processMessagesWithTools] Found tool calls in message:', {
        messageId: msg.id,
        role: msg.role,
        toolCallsCount: toolCalls.length,
        tools: toolCalls.map(tc => `${tc.server}:${tc.tool}`),
        contentLength: msg.content.length
      })
    }
    
    // Strip tool calls from content if there are any
    const cleanedContent = toolCalls.length > 0 
      ? stripToolCallsFromContent(msg.content)
      : msg.content
    
    return {
      ...msg,
      content: cleanedContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    }
  })
}

// Helper function to extract and clean JSON object from text
function extractJsonObject(text: string): string | null {
  // First, try to find a clean JSON object between curly braces
  const startIndex = text.indexOf('{')
  if (startIndex === -1) return null
  
  let braceCount = 0
  let inString = false
  let escapeNext = false
  let result = ''
  
  for (let i = startIndex; i < text.length; i++) {
    const char = text[i]
    
    if (escapeNext) {
      result += char
      escapeNext = false
      continue
    }
    
    if (char === '\\' && inString) {
      result += char
      escapeNext = true
      continue
    }
    
    if (char === '"' && !escapeNext) {
      result += char
      inString = !inString
      continue
    }
    
    // Add the character
    result += char
    
    // Track braces only when not in string
    if (!inString && !escapeNext) {
      if (char === '{') {
        braceCount++
      } else if (char === '}') {
        braceCount--
        if (braceCount === 0) {
          // Found complete JSON object
          return result
        }
      }
    }
  }
  
  return null
}

// Parse tool calls from message content
function parseToolCallsFromContent(content: string): MCPToolCall[] {
  const toolCalls: MCPToolCall[] = []
  
  // Pattern to find tool calls and their results
  // Handle both normal [/TOOL_CALL] and malformed cases where it might be split
  const toolCallPattern = /\[TOOL_CALL\]([\s\S]*?)(?:\[\/TOOL_CALL\]|\[\/[\s\S]*?TOOL_CALL\])/g
  
  let match: RegExpExecArray | null
  
  // Find tool call declarations
  match = toolCallPattern.exec(content)
  while (match !== null) {
    try {
      const toolCallContent = match[1].trim()
      
      console.log('[parseToolCallsFromContent] Found TOOL_CALL block:', {
        blockLength: toolCallContent.length,
        preview: `${toolCallContent.substring(0, 200)}...`
      })
      
      // Handle the malformed format where execution happens inside TOOL_CALL
      // Extract tool and server from the top part
      const toolMatch = toolCallContent.match(/"tool"\s*:\s*"([^"]+)"/)
      const serverMatch = toolCallContent.match(/"server"\s*:\s*"([^"]+)"/)
      
      if (!toolMatch || !serverMatch) {
        console.warn('Could not extract tool or server from TOOL_CALL block')
        continue
      }
      
      
      const toolCall: MCPToolCall = {
        id: `tool-${Date.now()}-${Math.random()}`,
        tool: toolMatch[1],
        server: serverMatch[1],
        status: 'completed', // Show as completed for immediate display
        isExpanded: false,
        timestamp: Date.now(),
        result: "Tool executed. Results displayed below.",
        duration: 1500 // Default duration for display
      }
      
      // Try to parse execution results if they exist
      const execPatterns = [
        /Tool executed successfully\.\s*\n+\s*({[\s\S]*?})\s*\n*\s*\[Tool execution completed/,
        /Tool executed successfully\.\s*\n+\s*({[\s\S]*?})/,
        /Tool executed successfully\.\s*\n+\s*([\s\S]*?)(?:\[Tool execution completed|$)/
      ]

      let execMatch = null
      for (const pattern of execPatterns) {
        execMatch = pattern.exec(toolCallContent)
        if (execMatch) break
      }
      
      if (execMatch) {
        try {
          const resultContent = execMatch[1].trim()
          
          // Check if this is a sequential thinking result with formatted output
          if (toolCall.tool === 'sequentialthinking' && resultContent.includes('🧠 **Sequential Thinking Progress**')) {
            // For sequential thinking, use the formatted output as-is
            toolCall.result = resultContent
          } else {
            // For other tools, try to parse as JSON
            const resultJson = extractJsonObject(resultContent)
            if (resultJson) {
              try {
                toolCall.result = JSON.parse(resultJson)
              } catch (e) {
                toolCall.result = resultJson
              }
            } else if (resultContent) {
              toolCall.result = resultContent
            }
          }
        } catch (e) {
          console.warn('Could not parse execution result:', e)
        }
      }
      
      toolCalls.push(toolCall)
      console.log('[parseToolCallsFromContent] Successfully parsed tool call:', {
        tool: toolCall.tool,
        server: toolCall.server,
        hasResult: !!toolCall.result
      })
    } catch (e) {
      console.error('Failed to parse tool call:', e)
      console.error('Tool call content:', match[1])
      // Continue processing other tool calls without throwing
    }
    
    // Get next match
    match = toolCallPattern.exec(content)
  }
  
  return toolCalls
}

// Remove tool calls and their execution results from content
function stripToolCallsFromContent(content: string): string {
  let cleanedContent = content
  
  // Debug: log original content length
  console.log('[stripToolCallsFromContent] Original content length:', content.length)
  
  // First, handle the malformed TOOL_CALL blocks where closing tag might be split
  // This regex is more flexible and handles cases where [/TOOL_CALL] might be split
  cleanedContent = cleanedContent.replace(/\[TOOL_CALL\][\s\S]*?(?:\[\/TOOL_CALL\]|\[\/[\s\S]*?TOOL_CALL\])/g, '')
  
  // Also handle cases where TOOL_CALL might not have a proper closing tag
  cleanedContent = cleanedContent.replace(/\[TOOL_CALL\][\s\S]*?(?=\n\n(?:[A-Z]|$))/g, '')
  
  // Remove any standalone TOOL_CALL] that might be left over
  cleanedContent = cleanedContent.replace(/TOOL_CALL\]/g, '')
  
  // Remove "Executing tool: ..." sections including the tool name, status, and results
  // Make this more aggressive to catch all execution content
  cleanedContent = cleanedContent.replace(
    /Executing tool:[\s\S]*?(?:\[Tool execution completed[^\]]*\])/g,
    ''
  )
  
  // Also remove standalone execution patterns
  cleanedContent = cleanedContent.replace(
    /✅ Executed[\s\S]*?(?=\n\n[🔍#]|$)/gu,
    ''
  )
  
  // Remove any content that looks like raw results display
  cleanedContent = cleanedContent.replace(
    /Results:\s*\n[\s\S]*?"costDollars"[\s\S]*?\}\s*\n?/g,
    ''
  )
  
  // Remove partial JSON fragments that might be left
  cleanedContent = cleanedContent.replace(
    /^\s*\],?\s*\n?\s*"[^"]+"\s*:[\s\S]*?\}\s*\n?\s*\}\s*$/gm,
    ''
  )
  
  // Remove [Tool execution completed...] markers
  cleanedContent = cleanedContent.replace(/\[Tool execution completed[^\]]*\]/g, '')
  
  // Remove IMAGE_GENERATION_COMPLETED markers and their content
  cleanedContent = cleanedContent.replace(/\[IMAGE_GENERATION_COMPLETED\][\s\S]*?\[\/IMAGE_GENERATION_COMPLETED\]/g, '')
  
  // Remove IMAGE_EDITING_COMPLETED markers and their content
  cleanedContent = cleanedContent.replace(/\[IMAGE_EDITING_COMPLETED\][\s\S]*?\[\/IMAGE_EDITING_COMPLETED\]/g, '')
  
  // Remove VIDEO_GENERATION_STARTED markers and their content
  cleanedContent = cleanedContent.replace(/\[VIDEO_GENERATION_STARTED\][\s\S]*?\[\/VIDEO_GENERATION_STARTED\]/g, '')
  
  // Remove TTS_GENERATION_STARTED markers and their content
  cleanedContent = cleanedContent.replace(/\[TTS_GENERATION_STARTED\][\s\S]*?\[\/TTS_GENERATION_STARTED\]/g, '')
  
  // Remove the analysis instruction marker
  cleanedContent = cleanedContent.replace(/\[Tool execution completed\. The results have been displayed to the user\. Now I need to analyze these results and provide insights to help answer your question\.\]/g, '')
  
  // Remove [AI_ANALYSIS_INSTRUCTION] markers and the instruction itself
  cleanedContent = cleanedContent.replace(/\[AI_ANALYSIS_INSTRUCTION\][\s\S]*?\[\/AI_ANALYSIS_INSTRUCTION\]/g, '')
  
  // Remove any lingering "Tool executed successfully." lines
  cleanedContent = cleanedContent.replace(/Tool executed successfully\.\n?/g, '')
  
  // Remove any JSON that looks like tool results (starts with { and contains requestId)
  cleanedContent = cleanedContent.replace(/\{\s*"requestId"[\s\S]*?\}\s*(?=\n|$)/g, '')
  
  // Remove the analysis prompt markers
  cleanedContent = cleanedContent.replace(/\[MANDATORY ANALYSIS - BEGIN IMMEDIATELY\]/g, '')
  cleanedContent = cleanedContent.replace(/\[CRITICAL: ANALYSIS MISSING\]/g, '')
  cleanedContent = cleanedContent.replace(/\[Beginning my analysis now\.\.\.\]/g, '')
  
  // Remove the analysis template instructions
  cleanedContent = cleanedContent.replace(/I have just executed the [\w-]+ tool and received results\. I MUST now provide a comprehensive analysis following this exact structure:\s*\n*/g, '')
  cleanedContent = cleanedContent.replace(/I notice I haven't provided the required analysis[^:]*:\s*\n*/g, '')
  
  // Remove placeholder text that might slip through
  cleanedContent = cleanedContent.replace(/- \[I will[^\]]*\]\s*\n*/g, '')
  cleanedContent = cleanedContent.replace(/\[I will[^\]]*\]\s*\n*/g, '')
  
  // Remove section separators
  cleanedContent = cleanedContent.replace(/---\s*\n*/g, '')
  
  // Remove standalone "undefined" that might appear
  cleanedContent = cleanedContent.replace(/^undefined\s*$/gm, '')
  cleanedContent = cleanedContent.replace(/\n\s*undefined\s*$/g, '')
  
  // Clean up extra newlines
  cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n').trim()
  
  // Debug: log cleaned content length
  console.log('[stripToolCallsFromContent] Cleaned content length:', cleanedContent.length)
  console.log('[stripToolCallsFromContent] Cleaned content preview:', cleanedContent.substring(0, 200))
  
  // If content is just "undefined" or empty, return empty string
  if (cleanedContent === 'undefined' || cleanedContent.trim() === '') {
    return ''
  }
  
  return cleanedContent
}


export function useChatWithTools(options: UseChatOptions & { 
  onDeepResearchProgress?: (data: { phase: string, progress: number }) => void,
  onDeepResearchStart?: (data: { topic: string, depth: string }) => void
}) {
  const [currentToolExecution, setCurrentToolExecution] = useState<{
    messageId: string
    toolName: string
    serverName: string
    startTime: number
  } | null>(null)
  
  // TTS generation state
  const [ttsGenerationState, setTtsGenerationState] = useState<{
    isActive: boolean
    phase: string
    progress: number
    text?: string
    voiceName?: string
    estimatedDuration?: string
    startTime?: number
  }>({
    isActive: false,
    phase: 'initializing',
    progress: 0
  })
  
  // Deep research state
  const [deepResearchState, setDeepResearchState] = useState<{
    isActive: boolean
    phase: string
    progress: number
    topic?: string
    depth?: string
  }>({
    isActive: false,
    phase: 'initializing',
    progress: 0
  })
  
  // Enhanced options to handle data messages
  const enhancedOptions = {
    ...options,
    experimental_onData: (data: any) => {
      console.log('[useChatWithTools] Received data:', data)
      
      // Check for TTS generation start signal
      if (data?.ttsGenerationStarted) {
        console.log('[useChatWithTools] TTS generation started:', data)
        setTtsGenerationState({
          isActive: true,
          phase: 'initializing',
          progress: 0,
          text: data.text || '',
          voiceName: data.voiceName || 'Eva',
          estimatedDuration: data.estimatedDuration,
          startTime: Date.now()
        })
      }
      
      // Check for TTS generation progress updates
      if (data?.ttsGenerationPhase || data?.ttsGenerationProgress !== undefined) {
        console.log('[useChatWithTools] TTS generation progress:', {
          phase: data.ttsGenerationPhase,
          progress: data.ttsGenerationProgress
        })
        setTtsGenerationState(prev => ({
          ...prev,
          phase: data.ttsGenerationPhase || prev.phase,
          progress: data.ttsGenerationProgress ?? prev.progress,
          isActive: data.ttsGenerationProgress < 100
        }))
      }
      
      // Check for TTS generation completion
      if (data?.ttsGenerationCompleted) {
        console.log('[useChatWithTools] TTS generation completed')
        setTtsGenerationState(prev => ({
          ...prev,
          isActive: false,
          phase: 'completed',
          progress: 100
        }))
      }
      
      // Check for deep research start signal
      if (data?.deepResearchStarted) {
        console.log('[useChatWithTools] Deep research started:', data)
        setDeepResearchState({
          isActive: true,
          phase: 'initializing',
          progress: 0,
          topic: data.topic || '',
          depth: data.depth || 'deep'
        })
        if (options.onDeepResearchStart) {
          options.onDeepResearchStart({
            topic: data.topic || '',
            depth: data.depth || 'deep'
          })
        }
      }
      
      // Check for deep research progress updates
      if (data?.deepResearchPhase || data?.deepResearchProgress !== undefined) {
        console.log('[useChatWithTools] Deep research progress:', {
          phase: data.deepResearchPhase,
          progress: data.deepResearchProgress
        })
        setDeepResearchState(prev => ({
          ...prev,
          phase: data.deepResearchPhase || prev.phase,
          progress: data.deepResearchProgress ?? prev.progress,
          isActive: data.deepResearchProgress < 100
        }))
        if (options.onDeepResearchProgress) {
          options.onDeepResearchProgress({
            phase: data.deepResearchPhase || 'initializing',
            progress: data.deepResearchProgress || 0
          })
        }
      }
      
      // Call original onData if provided
      if ((options as any).experimental_onData) {
        (options as any).experimental_onData(data)
      }
    }
  }
  
  // Use the original useChat hook with enhanced options
  const chatResult = useAiChat(enhancedOptions)
  
  // Process messages to extract tool calls - memoized to prevent unnecessary re-processing
  const messagesWithTools = useMemo(
    () => processMessagesWithTools(chatResult.messages || []),
    [chatResult.messages]
  )
  
  // Detect currently executing tool
  useEffect(() => {
    if (!messagesWithTools || messagesWithTools.length === 0) return
    const lastMessage = messagesWithTools[messagesWithTools.length - 1]
    if (!lastMessage) return
    
    // Check if message has tool calls that are executing
    if (lastMessage.toolCalls?.some(tc => tc.status === 'executing')) {
      const executingTool = lastMessage.toolCalls.find(tc => tc.status === 'executing')
      if (executingTool) {
        setCurrentToolExecution(prev => {
          // Only update if it's actually different
          if (prev?.messageId === lastMessage.id && 
              prev?.toolName === executingTool.tool &&
              prev?.serverName === executingTool.server) {
            return prev
          }
          return {
            messageId: lastMessage.id,
            toolName: executingTool.tool,
            serverName: executingTool.server,
            startTime: Date.now()
          }
        })
      }
    } else if (lastMessage.toolCalls?.every(tc => tc.status !== 'executing')) {
      // No tools are executing
      setCurrentToolExecution(null)
    }
  }, [messagesWithTools])
  
  // Monitor for todo tool executions to trigger autonomous task execution
  useEffect(() => {
    if (!messagesWithTools || messagesWithTools.length === 0) return
    const lastMessage = messagesWithTools[messagesWithTools.length - 1]
    if (!lastMessage || !lastMessage.toolCalls) return
    
    // Check if any todo_write tools were completed
    const completedTodoWrite = lastMessage.toolCalls.find(
      tc => tc.tool === 'todo_write' && tc.status === 'completed' && tc.result
    )
    
    if (completedTodoWrite) {
      console.log('[use-chat-with-tools] Todo write completed, checking for autonomous execution')
      
      // Import task executor and start execution
      import('@/lib/task-executor').then(({ taskExecutor, startAutonomousExecution }) => {
        const status = taskExecutor.getStatus()
        if (!status.isExecuting) {
          console.log('[use-chat-with-tools] Starting autonomous task execution')
          startAutonomousExecution(
            (taskId, status, message) => {
              console.log(`[Task ${taskId}] ${status}: ${message}`)
            },
            (stats) => {
              console.log('[use-chat-with-tools] Execution complete:', stats)
            }
          ).catch(err => {
            console.error('[use-chat-with-tools] Task execution error:', err)
          })
        }
      })
    }
  }, [messagesWithTools])

  // Monitor for TTS requests in user messages to activate TTS generation state
  useEffect(() => {
    if (!messagesWithTools || messagesWithTools.length === 0) return
    const lastMessage = messagesWithTools[messagesWithTools.length - 1]
    
    // Check if it's a user message with TTS command
    if (lastMessage?.role === 'user' && lastMessage.content && containsTTSCommand(lastMessage.content)) {
      // Only activate if not already active
      if (!ttsGenerationState.isActive) {
        console.log('[use-chat-with-tools] TTS command detected, activating TTS generation state')
        const ttsContent = extractTTSContent(lastMessage.content)
        const wordCount = ttsContent.text.split(/\s+/).length
        const estimatedSeconds = Math.max(10, Math.ceil(wordCount / 2.5))
        const estimatedDuration = estimatedSeconds < 60 ? `${estimatedSeconds}s` : `${Math.ceil(estimatedSeconds / 60)}m`
        
        setTtsGenerationState({
          isActive: true,
          phase: 'Initializing WaveSpeed API',
          progress: 0,
          text: ttsContent.text,
          voiceName: ttsContent.multiSpeaker ? 'Multi-Speaker' : (ttsContent.voiceName || 'Eva'),
          estimatedDuration,
          startTime: Date.now()
        })
      }
    }
    
    // ENHANCED: Check if it's an assistant message that indicates TTS completion
    if (lastMessage?.role === 'assistant' && lastMessage.content && ttsGenerationState.isActive) {
      // Look for TTS completion indicators in the content
      const hasTTSCompletion = lastMessage.content.includes('TTS_GENERATION_COMPLETED') || 
                               lastMessage.content.includes('audio has been generated') ||
                               lastMessage.content.includes('audio generation is complete')
      
      if (hasTTSCompletion) {
        console.log('[use-chat-with-tools] TTS completion detected, deactivating TTS generation state')
        setTtsGenerationState(prev => ({
          ...prev,
          isActive: false,
          phase: 'Audio generation complete',
          progress: 100
        }))
      }
    }
  }, [messagesWithTools, ttsGenerationState.isActive])

  // ENHANCED: Add real-time progress simulation for TTS generation
  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null
    
    if (ttsGenerationState.isActive && ttsGenerationState.startTime) {
      const simulateProgress = () => {
        const elapsed = Date.now() - (ttsGenerationState.startTime || Date.now())
        const elapsedSeconds = elapsed / 1000
        
        // Define realistic phase transitions based on elapsed time
        let newPhase = ttsGenerationState.phase
        let newProgress = ttsGenerationState.progress
        
        if (elapsedSeconds < 2) {
          newPhase = 'Initializing WaveSpeed API'
          newProgress = Math.min(15, (elapsedSeconds / 2) * 15)
        } else if (elapsedSeconds < 5) {
          newPhase = 'Processing text input'
          newProgress = Math.min(30, 15 + ((elapsedSeconds - 2) / 3) * 15)
        } else if (elapsedSeconds < 8) {
          newPhase = 'Generating speech synthesis'
          newProgress = Math.min(60, 30 + ((elapsedSeconds - 5) / 3) * 30)
        } else if (elapsedSeconds < 12) {
          newPhase = 'Processing audio output'
          newProgress = Math.min(85, 60 + ((elapsedSeconds - 8) / 4) * 25)
        } else {
          newPhase = 'Finalizing audio file'
          newProgress = Math.min(95, 85 + ((elapsedSeconds - 12) / 3) * 10)
        }
        
        // Only update if values have changed to avoid unnecessary re-renders
        if (newPhase !== ttsGenerationState.phase || Math.floor(newProgress) !== Math.floor(ttsGenerationState.progress)) {
          setTtsGenerationState(prev => ({
            ...prev,
            phase: newPhase,
            progress: newProgress
          }))
        }
      }
      
      // Update progress every 500ms for smooth animation
      progressInterval = setInterval(simulateProgress, 500)
      
      // Run initial simulation immediately
      simulateProgress()
    }
    
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
    }
  }, [ttsGenerationState.isActive, ttsGenerationState.startTime, ttsGenerationState.phase, ttsGenerationState.progress])
  
  return {
    ...chatResult,
    messages: messagesWithTools,
    mcpToolExecuting: currentToolExecution,
    deepResearchState,
    ttsGenerationState,
    append: chatResult.append // Explicitly expose append method
  }
}
