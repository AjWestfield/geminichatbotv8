import { useState, useEffect, useCallback, useRef } from 'react'
import { ChatSummary, Chat, Message as DBMessage } from '@/lib/database/supabase'
import { GeneratedImage } from '@/lib/image-utils'
import { GeneratedVideo } from '@/lib/video-generation-types'
import { Message } from 'ai'
import { generateChatTitle } from '@/lib/chat-naming'
import { hasValidPermanentUrl } from '@/lib/video-validation'
import { clearChatCache } from '@/lib/services/chat-persistence-optimized'

export function useChatPersistence(initialChatId?: string) {
  const [currentChatId, setCurrentChatId] = useState<string | null>(initialChatId || null)
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all chats for sidebar
  const fetchChats = useCallback(async () => {
    try {
      const response = await fetch('/api/chats')
      if (!response.ok) throw new Error('Failed to fetch chats')
      const data = await response.json()
      setChats(data.chats)
      console.log('[PERSISTENCE] Fetched chats:', data.chats.length)
    } catch (error) {
      console.error('Error fetching chats:', error)
      setError('Failed to load chat history')
    }
  }, [])

  // Create a new chat
  const createNewChat = useCallback(async (title: string, model: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, model }),
      })

      if (!response.ok) throw new Error('Failed to create chat')

      const data = await response.json()
      setCurrentChatId(data.chat.id)
      
      // Immediately refresh chat list to show new chat
      console.log('[PERSISTENCE] New chat created, refreshing chat list immediately...')
      fetchChats() // Don't await - let it update in background
      
      return data.chat
    } catch (error) {
      console.error('Error creating chat:', error)
      setError('Failed to create new chat')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [fetchChats])

  // Save a message
  const saveMessage = useCallback(async (
    chatId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    attachments?: any[]
  ) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content, attachments }),
      })

      if (!response.ok) {
        console.warn('Failed to save message, but continuing...');
        return null;
      }

      const data = await response.json()
      return data.message
    } catch (error) {
      console.error('Error saving message:', error)
      return null
    }
  }, [])

  // Track last save time to prevent rapid saves
  const lastSaveTimeRef = useRef<number>(0)
  const MIN_SAVE_INTERVAL = 1000 // Minimum 1 second between saves

  // Save messages from the chat interface
  const saveMessages = useCallback(async (messages: Message[], model: string, attachments?: Record<string, any>) => {
    if (messages.length === 0) return

    // Throttle saves to prevent too many API calls
    const now = Date.now()
    if (now - lastSaveTimeRef.current < MIN_SAVE_INTERVAL) {
      console.log('[PERSISTENCE] Throttling message save - too soon since last save')
      return { chatId: currentChatId, success: false }
    }
    lastSaveTimeRef.current = now

    try {
      // Create a new chat if we don't have one
      let chatId = currentChatId
      if (!chatId) {
        // Filter for user messages only for title generation
        const userMessages = messages.filter(m => m.role === 'user' && m.id !== 'welcome-message')
        
        // Generate intelligent title from user messages only
        console.log('[PERSISTENCE] User messages for title generation:', userMessages.map(m => ({ content: m.content.substring(0, 50) + '...', role: m.role })))
        
        const title = userMessages.length > 0 
          ? generateChatTitle(userMessages, 50)
          : 'New Chat'
          
        console.log('[PERSISTENCE] Generated title:', title, 'from', userMessages.length, 'user messages')
        console.log('[PERSISTENCE] Creating new chat with title:', title)

        const chat = await createNewChat(title, model)
        if (!chat) {
          // Persistence not configured - return gracefully
          console.log('Persistence not configured - message saving skipped')
          return { chatId: null, success: false }
        }
        chatId = chat.id
        
        // Don't need to refresh here since createNewChat already does it
      }

      // Save all messages with their attachments
      let messageCount = 0
      for (const message of messages) {
        // Skip welcome message
        if (message.id === 'welcome-message') continue

        // Get attachments for this message
        const messageAttachments = attachments?.[message.id] || []

        const savedMessage = await saveMessage(
          chatId,
          message.role as 'user' | 'assistant' | 'system',
          message.content,
          messageAttachments
        )

        // If any message fails to save, log but continue
        // This allows video generation to proceed even if persistence fails
        if (!savedMessage) {
          console.log('Failed to save message, but continuing...')
        } else {
          messageCount++
        }
      }

      console.log(`[PERSISTENCE] Saved ${messageCount} messages to chat ${chatId}`)

      // Clear cache for this chat since it's been updated
      if (chatId) {
        clearChatCache(chatId)
      }

      // Refresh chats immediately to update sidebar
      if (messageCount > 0 || !currentChatId) {
        fetchChats() // Don't await - let it update in background
      }

      return { chatId, success: true }
    } catch (error) {
      console.error('Error saving messages:', error)
      return { chatId: currentChatId, success: false }
    }
  }, [currentChatId, createNewChat, saveMessage, fetchChats])

  // Save an image
  const saveImage = useCallback(async (image: GeneratedImage) => {
    try {
      const response = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          chatId: currentChatId,
        }),
      })

      if (!response.ok) {
        // Parse error response
        const errorData = await response.json().catch(() => null)
        
        // Check if it's an image validation error (422)
        if (response.status === 422 && errorData?.isImageError) {
          console.error('Image validation error:', errorData.details)
          // Throw the error so the UI can handle it
          throw new Error(errorData.details || 'The generated image is invalid')
        }
        
        // Only log non-persistence errors
        if (response.status !== 500) {
          console.warn('Failed to save image:', response.status)
        }
        return null
      }

      const data = await response.json()
      
      // Clear cache for this chat since it's been updated
      if (currentChatId) {
        clearChatCache(currentChatId)
      }
      
      return data.image
    } catch (error: any) {
      // Re-throw image validation errors
      if (error.message?.includes('Image generation failed:') || 
          error.message?.includes('Invalid image response:') ||
          error.message?.includes('Failed to fetch image:')) {
        throw error
      }
      // Silently fail for other persistence errors
      return null
    }
  }, [currentChatId])

  // Delete a chat
  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete chat')

      // Clear cache for the deleted chat
      clearChatCache(chatId)

      if (currentChatId === chatId) {
        setCurrentChatId(null)
      }

      await fetchChats() // Refresh chat list
      return true
    } catch (error) {
      console.error('Error deleting chat:', error)
      setError('Failed to delete chat')
      return false
    }
  }, [currentChatId, fetchChats])

  // Update chat title
  const updateChatTitle = useCallback(async (chatId: string, title: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })

      if (!response.ok) throw new Error('Failed to update chat')

      await fetchChats() // Refresh chat list
      return true
    } catch (error) {
      console.error('Error updating chat:', error)
      return false
    }
  }, [fetchChats])

  // Load a specific chat with retry logic for timeout errors
  const loadChat = useCallback(async (chatId: string, retryCount = 0) => {
    setIsLoading(true)
    setError(null)
    try {
      console.log('[CHAT PERSISTENCE] Loading chat:', chatId, retryCount > 0 ? `(retry ${retryCount})` : '')
      
      // Validate chatId
      if (!chatId || typeof chatId !== 'string' || chatId.trim() === '') {
        console.error('[CHAT PERSISTENCE] Invalid chat ID:', chatId)
        throw new Error('Invalid chat ID provided')
      }
      
      // Remove any whitespace
      const cleanChatId = chatId.trim()
      
      const response = await fetch(`/api/chats/${cleanChatId}`)
      
      console.log('[CHAT PERSISTENCE] Response status:', response.status, response.statusText)
      
      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = 'Failed to load chat'
        let errorDetails: any = null
        
        try {
          const contentType = response.headers.get('content-type')
          const isJson = contentType && contentType.includes('application/json')
          
          if (isJson) {
            try {
              errorDetails = await response.json()
              errorMessage = errorDetails.message || errorDetails.error || errorMessage
              console.error('[CHAT PERSISTENCE] Error response:', errorDetails)
            } catch (jsonError) {
              console.error('[CHAT PERSISTENCE] Failed to parse JSON error response:', jsonError)
              errorMessage = `Failed to load chat: ${response.status} ${response.statusText}`
            }
          } else {
            // Try to read as text if not JSON
            try {
              const responseText = await response.text()
              if (responseText && responseText.trim() !== '') {
                const truncatedText = responseText.length > 100 ? responseText.substring(0, 100) + '...' : responseText
                errorMessage = `Failed to load chat: ${truncatedText}`
              } else {
                errorMessage = `Failed to load chat: ${response.status} ${response.statusText}`
              }
            } catch (textError) {
              console.error('[CHAT PERSISTENCE] Failed to read response text:', textError)
              errorMessage = `Failed to load chat: ${response.status} ${response.statusText || 'Unknown error'}`
            }
          }
        } catch (error) {
          console.error('[CHAT PERSISTENCE] Error processing response:', error)
          errorMessage = `Failed to load chat: ${response.status} ${response.statusText || 'Unknown error'}`
        }
        
        // Check if it's a timeout error and we haven't exceeded retry limit
        const isTimeoutError = errorDetails?.isTimeout || 
                             errorDetails?.details?.includes('timeout') || 
                             errorDetails?.details?.includes('57014') ||
                             response.status === 504
        
        if (isTimeoutError) {
          // For timeout errors, show specific message and don't retry
          console.log('[CHAT PERSISTENCE] Database timeout error - optimization needed')
          const { toast } = await import('sonner')
          toast.error('Chat loading timeout', {
            description: 'This chat has too many messages. Database optimization is needed.',
            duration: 8000,
            action: {
              label: 'Learn More',
              onClick: () => {
                toast.info('To fix this issue:', {
                  description: 'Run: npm run db:optimize-performance',
                  duration: 10000
                })
              }
            }
          })
          errorMessage = 'Database timeout - optimization needed'
        } else if (response.status === 504 && retryCount < 2) {
          // For other 504 errors, retry
          console.log('[CHAT PERSISTENCE] Gateway timeout, retrying in 1 second...')
          const { toast } = await import('sonner')
          toast.info(`Retrying chat load (attempt ${retryCount + 2}/3)...`, {
            duration: 2000
          })
          await new Promise(resolve => setTimeout(resolve, 1000))
          return loadChat(cleanChatId, retryCount + 1)
        }
        
        throw new Error(errorMessage)
      }

      let data: any
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error('[CHAT PERSISTENCE] Failed to parse successful response as JSON:', jsonError)
        throw new Error('Invalid response format from server')
      }
      
      console.log('[CHAT PERSISTENCE] Response data received:', {
        hasData: !!data,
        hasChat: !!data?.chat,
        hasMessages: !!data?.messages,
        messageCount: data?.messages?.length || 0,
        chatId: data?.chat?.id,
        responseKeys: Object.keys(data || {})
      })
      
      // Validate the response data
      if (!data || typeof data !== 'object') {
        console.error('[CHAT PERSISTENCE] Invalid response - not an object:', data)
        throw new Error('Invalid response format from server')
      }
      
      if (!data.chat || !data.messages) {
        console.error('[CHAT PERSISTENCE] Invalid chat data structure:', {
          data,
          hasChat: !!data.chat,
          hasMessages: !!data.messages,
          dataKeys: Object.keys(data)
        })
        throw new Error('Invalid chat data received from server - missing required fields')
      }
      
      console.log('[CHAT PERSISTENCE] Successfully loaded chat:', {
        chatId: data.chat.id,
        title: data.chat.title,
        messageCount: data.messages.length
      })
      
      setCurrentChatId(cleanChatId)
      return data
    } catch (error) {
      console.error('[CHAT PERSISTENCE] Error loading chat:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load chat'
      setError(errorMessage)
      
      // Re-throw the error so the calling function can handle it
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Search chats
  const searchChats = useCallback(async (query: string) => {
    try {
      const response = await fetch(`/api/chats?search=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error('Failed to search chats')

      const data = await response.json()
      return data.chats
    } catch (error) {
      console.error('Error searching chats:', error)
      return []
    }
  }, [])

  // Load all images from database - memoized with empty deps to prevent recreation
  const loadAllImages = useCallback(async () => {
    try {
      const response = await fetch('/api/images?limit=100')
      if (!response.ok) throw new Error('Failed to load images')

      const data = await response.json()
      console.log('[PERSISTENCE] Raw API response:', {
        total: data.images?.length || 0,
        sample: data.images?.[0],
        hasOriginalImageId: data.images?.filter((img: any) => img.original_image_id).length || 0
      })

      // Convert stored images to GeneratedImage format
      const mapped = data.images.map((img: any) => {
        // Safely handle timestamp conversion
        let timestamp: Date
        try {
          if (img.created_at) {
            timestamp = new Date(img.created_at)
            // Verify the date is valid
            if (isNaN(timestamp.getTime())) {
              timestamp = new Date()
            }
          } else {
            timestamp = new Date()
          }
        } catch {
          timestamp = new Date()
        }

        return {
          id: img.metadata?.localId || img.id,
          url: img.url,
          prompt: img.prompt,
          revisedPrompt: img.revised_prompt,
          timestamp,
          quality: img.quality,
          style: img.style,
          size: img.size,
          model: img.model,
          isUploaded: img.is_uploaded,
          originalImageId: img.original_image_id || img.metadata?.originalImageId, // Check both fields
          geminiUri: img.metadata?.geminiUri, // Restore Gemini URI for uploaded images
          // Restore multi-image edit fields from metadata
          isMultiImageEdit: img.metadata?.isMultiImageEdit,
          isMultiImageComposition: img.metadata?.isMultiImageComposition,
          sourceImages: img.metadata?.sourceImages,
          inputImages: img.metadata?.inputImages,
          metadata: img.metadata
        }
      })

      console.log('[PERSISTENCE] Mapped images:', {
        total: mapped.length,
        edited: mapped.filter((img: any) => img.originalImageId).length,
        multiEdit: mapped.filter((img: any) => img.isMultiImageEdit).length,
        sample: mapped.filter((img: any) => img.originalImageId)[0]
      })

      // For multi-image edits, fetch source images from the relations table
      const multiEditImages = mapped.filter((img: any) => img.isMultiImageEdit || img.isMultiImageComposition)
      if (multiEditImages.length > 0) {
        console.log('[PERSISTENCE] Fetching source images for', multiEditImages.length, 'multi-edit images')
        
        for (const multiEditImage of multiEditImages) {
          try {
            // Import the function dynamically to avoid circular dependencies
            const { getSourceImagesForEdit } = await import('@/lib/services/chat-persistence')
            const sourceImages = await getSourceImagesForEdit(multiEditImage.id)
            
            if (sourceImages.length > 0) {
              // Update the inputImages array with actual URLs from source images
              multiEditImage.inputImages = sourceImages.map((src: any) => src.url)
              multiEditImage.sourceImages = sourceImages.map((src: any) => src.metadata?.localId || src.id)
              console.log('[PERSISTENCE] Restored', sourceImages.length, 'source images for', multiEditImage.id)
            }
          } catch (error) {
            console.error('[PERSISTENCE] Error fetching source images for', multiEditImage.id, error)
          }
        }
      }

      return mapped
    } catch (error) {
      console.error('Error loading all images:', error)
      return []
    }
  }, []) // Empty deps array - this function doesn't depend on any props/state

  // Save a video
  const saveVideo = useCallback(async (video: GeneratedVideo) => {
    // Validate video before saving to database
    if (video.status === 'completed' && !hasValidPermanentUrl(video)) {
      console.warn('[PERSISTENCE] Not saving video with invalid URL to database:', video.id, video.url)
      return null
    }
    
    try {
      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video,
          chatId: currentChatId,
        }),
      })

      // Don't throw error for persistence failures - just return null
      if (!response.ok) {
        // Only log non-persistence errors
        if (response.status !== 500) {
          console.warn('Failed to save video:', response.status)
        }
        return null
      }

      const data = await response.json()
      
      // Clear cache for this chat since it's been updated
      if (currentChatId) {
        clearChatCache(currentChatId)
      }
      
      return data.video
    } catch (error) {
      // Silently fail for persistence errors
      return null
    }
  }, [currentChatId])

  // Load all videos from database - memoized with empty deps to prevent recreation
  const loadAllVideos = useCallback(async () => {
    try {
      const response = await fetch('/api/videos?limit=100')
      if (!response.ok) throw new Error('Failed to load videos')

      const data = await response.json()
      // Convert stored videos to GeneratedVideo format
      return data.videos.map((vid: any) => ({
        id: vid.metadata?.localId || vid.id,
        url: vid.url,
        thumbnailUrl: vid.thumbnail_url,
        prompt: vid.prompt,
        duration: vid.duration,
        aspectRatio: vid.aspect_ratio,
        model: vid.model,
        sourceImage: vid.source_image_url,
        status: vid.status,
        createdAt: new Date(vid.created_at),
        completedAt: vid.completed_at ? new Date(vid.completed_at) : undefined,
        finalElapsedTime: vid.final_elapsed_time,
        error: vid.error_message,
      }))
    } catch (error) {
      console.error('Error loading all videos:', error)
      return []
    }
  }, []) // Empty deps array - this function doesn't depend on any props/state

  // Delete a video
  const deleteVideo = useCallback(async (videoId: string) => {
    try {
      const response = await fetch(`/api/videos?id=${videoId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        console.warn('Failed to delete video from database:', response.status)
      } else {
        // Clear cache for the current chat since it's been updated
        if (currentChatId) {
          clearChatCache(currentChatId)
        }
      }

      return response.ok
    } catch (error) {
      console.error('Error deleting video:', error)
      return false
    }
  }, [currentChatId])

  // Load chats on mount
  useEffect(() => {
    fetchChats()
  }, [fetchChats])

  return {
    currentChatId,
    setCurrentChatId,
    chats,
    isLoading,
    error,
    createNewChat,
    saveMessage,
    saveMessages,
    saveImage,
    saveVideo,
    deleteVideo,
    deleteChat,
    updateChatTitle,
    loadChat,
    searchChats,
    refreshChats: fetchChats,
    loadAllImages,
    loadAllVideos,
  }
}
