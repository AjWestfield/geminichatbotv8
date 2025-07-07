import { supabase, isPersistenceConfigured, Chat, Message, StoredImage, StoredVideo, ChatSummary } from '@/lib/database/supabase'
import { uploadImageToBlob } from '@/lib/storage/blob-storage'
import { GeneratedImage } from '@/lib/image-utils'
import { GeneratedVideo } from '@/lib/video-generation-types'

// Create a new chat
export async function createChat(title: string, model: string): Promise<Chat | null> {
  if (!isPersistenceConfigured() || !supabase) {
    console.log('Persistence not configured - chat creation skipped')
    return null
  }

  try {
    const { data, error } = await supabase
      .from('chats')
      .insert({
        title,
        model,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error: any) {
    // Only log if it's not a connection error (which is expected when not configured)
    if (!error.message?.includes('fetch failed')) {
      console.error('Error creating chat:', error)
    }
    return null
  }
}

// Get all chats (for sidebar)
export async function getChats(limit = 50): Promise<ChatSummary[]> {
  if (!isPersistenceConfigured() || !supabase) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('chat_summaries')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error: any) {
    // Only log if it's not a connection error (which is expected when not configured)
    if (!error.message?.includes('fetch failed')) {
      console.error('Error fetching chats:', error)
    }
    return []
  }
}

// Get a single chat with messages, images, videos, and canvas state
export async function getChat(chatId: string): Promise<{
  chat: Chat;
  messages: Message[];
  images?: StoredImage[];
  videos?: StoredVideo[];
  canvasState?: any;
  messagesPagination?: {
    total: number;
    loaded: number;
    hasMore: boolean;
    offset: number;
    error?: string;
  };
} | null> {
  if (!isPersistenceConfigured() || !supabase) {
    console.log('[CHAT PERSISTENCE] Persistence not configured, returning null')
    return null
  }

  if (!chatId) {
    console.error('[CHAT PERSISTENCE] No chatId provided to getChat')
    return null
  }

  try {
    console.log('[CHAT PERSISTENCE] Fetching chat:', chatId)
    
    // Get chat with canvas_state
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single()

    if (chatError) {
      console.error('[CHAT PERSISTENCE] Error fetching chat:', chatError)
      throw chatError
    }

    if (!chat) {
      console.error('[CHAT PERSISTENCE] Chat not found:', chatId)
      return null
    }

    console.log('[CHAT PERSISTENCE] Found chat:', chat.title)

    // EMERGENCY FIX: Skip messages query entirely if database is too slow
    // Try to load messages but with aggressive timeout
    const messageLimit = 10 // Further reduced to just 10 messages
    
    console.log('[CHAT PERSISTENCE] Attempting to load last', messageLimit, 'messages with 3 second timeout')
    
    let recentMessages = null
    let messagesError = null
    
    try {
      // Try to load messages with very short timeout
      const messagesPromise = supabase
        .from('messages')
        .select(`
          id,
          chat_id,
          role,
          content,
          created_at,
          attachments
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(messageLimit)
      
      // Use Promise.race with a timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 3000)
      )
      
      const result = await Promise.race([messagesPromise, timeoutPromise])
      recentMessages = result.data
      messagesError = result.error
    } catch (timeoutError) {
      console.log('[CHAT PERSISTENCE] Messages query timed out after 3 seconds')
      messagesError = { code: '57014', message: 'Query timeout' }
    }
    
    // Reverse to get chronological order
    const messages = recentMessages ? recentMessages.reverse() : []
    
    console.log('[CHAT PERSISTENCE] Loaded', messages?.length || 0, 'recent messages')

    if (messagesError) {
      console.error('[CHAT PERSISTENCE] Error fetching messages:', messagesError)
      
      // Check if it's a timeout error
      if (messagesError.code === '57014' || messagesError.message?.includes('timeout')) {
        console.error('[CHAT PERSISTENCE] Database timeout even with limited query!')
        console.error('[CHAT PERSISTENCE] Returning chat without messages - database needs urgent optimization')
        
        // Return chat info without messages as emergency fallback
        const result = {
          chat,
          messages: [], // Empty messages to at least show the chat
          images: [],
          videos: [],
          canvasState: (chat as any).canvas_state || {},
          messagesPagination: {
            total: -1,
            loaded: 0,
            hasMore: true,
            offset: 0,
            error: 'Database timeout - messages could not be loaded. Please run: npm run db:emergency-fix'
          }
        }
        
        return result
      }
      
      throw messagesError
    }

    console.log('[CHAT PERSISTENCE] Found', messages?.length || 0, 'messages')

    // Skip images and videos queries if messages failed to avoid more timeouts
    let images: StoredImage[] = []
    let videos: StoredVideo[] = []
    
    // Only fetch images/videos if messages loaded successfully
    if (messages && messages.length > 0) {
      // Get images (don't fail if this errors)
      const { data: imagesData, error: imagesError } = await supabase
        .from('images')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (imagesError) {
        console.warn('[CHAT PERSISTENCE] Error fetching images:', imagesError)
      } else {
        images = imagesData || []
        console.log('[CHAT PERSISTENCE] Found', images.length, 'images')
      }

      // Get videos (don't fail if this errors)
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (videosError) {
        console.warn('[CHAT PERSISTENCE] Error fetching videos:', videosError)
      } else {
        videos = videosData || []
        console.log('[CHAT PERSISTENCE] Found', videos.length, 'videos')
      }
    } else {
      console.log('[CHAT PERSISTENCE] Skipping images/videos queries due to message loading issues')
    }

    const result = {
      chat,
      messages: messages || [],
      images: images || [],
      videos: videos || [],
      canvasState: (chat as any).canvas_state || {},
      // Include pagination info - simplified without total count
      messagesPagination: {
        total: -1, // Unknown due to timeout issues
        loaded: messages?.length || 0,
        hasMore: messages?.length === messageLimit, // If we got exactly the limit, there might be more
        offset: 0
      }
    }

    console.log('[CHAT PERSISTENCE] Returning complete chat data with pagination info')
    return result
  } catch (error: any) {
    // Log all errors for debugging
    console.error('[CHAT PERSISTENCE] Error fetching chat:', {
      chatId,
      error: error.message || 'Unknown error',
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    
    // Only suppress connection errors when persistence is not configured
    if (error.message?.includes('fetch failed') && !isPersistenceConfigured()) {
      return null
    }
    
    throw error
  }
}

// Ensure a chat exists in the database (handles local chat IDs)
export async function ensureChatExists(chatId: string, initialModel?: string): Promise<string> {
  if (!isPersistenceConfigured() || !supabase) {
    return chatId // Return as-is if persistence not configured
  }

  // Check if this is a local chat ID
  if (chatId.startsWith('local-')) {
    console.log('[ENSURE CHAT EXISTS] Converting local chat ID to database chat:', chatId)
    
    try {
      // Create a new chat in the database
      const { data, error } = await supabase
        .from('chats')
        .insert({
          title: 'New Chat',
          model: initialModel || 'gemini-2.0-flash',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('[ENSURE CHAT EXISTS] Error creating chat:', error)
        throw error
      }

      console.log('[ENSURE CHAT EXISTS] Created new chat with ID:', data.id)
      return data.id
    } catch (error) {
      console.error('[ENSURE CHAT EXISTS] Failed to create chat:', error)
      throw error
    }
  }

  // For non-local IDs, verify the chat exists
  try {
    const { data, error } = await supabase
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .single()

    if (error || !data) {
      console.error('[ENSURE CHAT EXISTS] Chat not found:', chatId)
      throw new Error('Chat not found')
    }

    return chatId
  } catch (error) {
    console.error('[ENSURE CHAT EXISTS] Error verifying chat:', error)
    throw error
  }
}

// Add a message to a chat
export async function addMessage(
  chatId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  attachments?: any[]
): Promise<Message | null> {
  if (!isPersistenceConfigured() || !supabase) {
    return null
  }

  try {
    // Ensure the chat exists and get the proper ID
    const properChatId = await ensureChatExists(chatId)
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: properChatId,
        role,
        content,
        attachments: attachments || [],
      })
      .select()
      .single()

    if (error) throw error

    // Update chat's updated_at
    await supabase
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', properChatId)

    return data
  } catch (error: any) {
    // Only log if it's not a connection error
    if (!error.message?.includes('fetch failed')) {
      console.error('Error adding message:', error)
    }
    return null
  }
}

// Update chat title
export async function updateChatTitle(chatId: string, title: string): Promise<boolean> {
  if (!isPersistenceConfigured() || !supabase) {
    return false
  }

  try {
    const { error } = await supabase
      .from('chats')
      .update({ title })
      .eq('id', chatId)

    if (error) throw error
    return true
  } catch (error: any) {
    // Only log if it's not a connection error
    if (!error.message?.includes('fetch failed')) {
      console.error('Error updating chat title:', error)
    }
    return false
  }
}

// Update canvas state for a chat
export async function updateCanvasState(chatId: string, canvasState: any): Promise<boolean> {
  if (!isPersistenceConfigured() || !supabase) {
    return false
  }

  try {
    console.log('[UPDATE CANVAS STATE] Updating for chat:', chatId, canvasState)

    const { error } = await supabase
      .from('chats')
      .update({
        canvas_state: canvasState,
        updated_at: new Date().toISOString()
      })
      .eq('id', chatId)

    if (error) throw error

    console.log('[UPDATE CANVAS STATE] Successfully updated')
    return true
  } catch (error: any) {
    console.error('[UPDATE CANVAS STATE] Error:', error)
    return false
  }
}

// Get canvas state for a chat
export async function getCanvasState(chatId: string): Promise<any | null> {
  if (!isPersistenceConfigured() || !supabase) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('chats')
      .select('canvas_state')
      .eq('id', chatId)
      .single()

    if (error) throw error

    return data?.canvas_state || {}
  } catch (error: any) {
    console.error('[GET CANVAS STATE] Error:', error)
    return null
  }
}

// Delete a chat
export async function deleteChat(chatId: string): Promise<boolean> {
  if (!isPersistenceConfigured() || !supabase) {
    return false
  }

  try {
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId)

    if (error) throw error
    return true
  } catch (error: any) {
    // Only log if it's not a connection error
    if (!error.message?.includes('fetch failed')) {
      console.error('Error deleting chat:', error)
    }
    return false
  }
}

// Save image to database and blob storage
export async function saveImage(
  image: GeneratedImage,
  chatId?: string,
  messageId?: string
): Promise<StoredImage | null> {
  if (!isPersistenceConfigured() || !supabase) {
    console.log('[SAVE IMAGE] Persistence not configured')
    return null
  }

  console.log('[SAVE IMAGE] Starting save for image:', {
    id: image.id,
    model: image.model,
    isUploaded: image.isUploaded,
    prompt: image.prompt,
    urlType: image.url.startsWith('data:') ? 'data URL' : 'external URL',
    chatId: chatId
  })

  try {
    // Ensure the chat exists and get the proper ID
    let properChatId = chatId
    if (chatId) {
      properChatId = await ensureChatExists(chatId)
    }
    
    // Upload to blob storage first
    const extension = image.isUploaded ? 'png' : 'png' // Keep as PNG for uploaded images
    const filename = `${image.id}-${Date.now()}.${extension}`
    console.log('[SAVE IMAGE] Uploading to blob storage with filename:', filename)
    console.log('[SAVE IMAGE] Image type:', image.isUploaded ? 'uploaded' : 'generated')
    const blobUrl = await uploadImageToBlob(image.url, filename)
    console.log('[SAVE IMAGE] Blob storage upload result:', blobUrl)

    // Save to database
    const insertData: any = {
      chat_id: properChatId,
      message_id: messageId,
      url: blobUrl,
      prompt: image.prompt,
      revised_prompt: image.revisedPrompt,
      quality: image.quality,
      style: image.style,
      size: image.size,
      model: image.model,
      is_uploaded: image.isUploaded || false,
      metadata: {
        localId: image.id,
        timestamp: image.timestamp,
        geminiUri: image.geminiUri, // Preserve Gemini URI for uploaded images
        originalImageId: image.originalImageId, // Store in metadata as backup
        isMultiImageEdit: image.isMultiImageEdit, // Preserve multi-edit flag
        isMultiImageComposition: image.isMultiImageComposition, // Preserve multi-composition flag
        sourceImages: image.sourceImages, // Array of source image IDs
        inputImages: image.inputImages, // Array of source image URLs
      },
    }

    // Handle original_image_id - convert local ID to database UUID if needed
    if (image.originalImageId) {
      // Check if it looks like a UUID (basic check)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(image.originalImageId)
      if (isUUID) {
        insertData.original_image_id = image.originalImageId
        console.log('[SAVE IMAGE] Using UUID for original_image_id:', image.originalImageId)
      } else {
        // For local IDs, look up the database UUID with retry logic
        console.log('[SAVE IMAGE] Looking up database UUID for local ID:', image.originalImageId)
        try {
          let originalImage = await getImageByLocalId(image.originalImageId)

          // If not found, wait a bit and try again (timing issue fix)
          if (!originalImage) {
            console.log('[SAVE IMAGE] Original image not found, retrying in 1 second...')
            await new Promise(resolve => setTimeout(resolve, 1000))
            originalImage = await getImageByLocalId(image.originalImageId)
          }

          if (originalImage) {
            insertData.original_image_id = originalImage.id
            console.log('[SAVE IMAGE] Found database UUID for original image:', originalImage.id)
          } else {
            console.log('[SAVE IMAGE] Original image not found in database after retry, storing local ID in metadata only')
          }
        } catch (error) {
          console.error('[SAVE IMAGE] Error looking up original image:', error)
        }
      }
    }

    console.log('[SAVE IMAGE] Inserting to database:', insertData)

    const { data, error } = await supabase
      .from('images')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('[SAVE IMAGE] Database insert error:', error)
      throw error
    }

    console.log('[SAVE IMAGE] Successfully saved to database:', data)

    // Handle multi-image source relationships
    if ((image.isMultiImageEdit || image.isMultiImageComposition) && image.sourceImages && image.sourceImages.length > 0) {
      console.log('[SAVE IMAGE] Saving source image relationships for multi-image edit/composition')

      // Process source images - handle both IDs and direct image data
      const sourceImagePromises = image.sourceImages.map(async (sourceIdOrImage, index) => {
        let sourceImageDbId: string | null = null

        // Check if this is already a database ID
        const existingImage = await getImageByLocalId(sourceIdOrImage)

        if (existingImage) {
          sourceImageDbId = existingImage.id
          console.log(`[SAVE IMAGE] Found existing source image in database: ${sourceIdOrImage}`)
        } else if (image.inputImages && image.inputImages[index]) {
          // Try to save the source image from inputImages URLs
          console.log(`[SAVE IMAGE] Source image ${sourceIdOrImage} not in database, attempting to save from URL`)

          const sourceUrl = image.inputImages[index]
          if (sourceUrl && typeof sourceUrl === 'string') {
            // Create a temporary GeneratedImage object for the source
            const tempSourceImage: GeneratedImage = {
              id: sourceIdOrImage,
              url: sourceUrl,
              prompt: `Source image ${index + 1} for multi-edit`,
              timestamp: new Date(),
              quality: 'hd',
              model: 'unknown',
              size: '1024x1024',
              isGenerating: false,
              isUploaded: true
            }

            // Save the source image
            const savedSource = await saveImage(tempSourceImage, chatId)
            if (savedSource) {
              sourceImageDbId = savedSource.id
              console.log(`[SAVE IMAGE] Successfully saved source image ${sourceIdOrImage} to database`)
            }
          }
        }

        if (!sourceImageDbId) {
          console.log(`[SAVE IMAGE] Could not save or find source image ${sourceIdOrImage}, skipping relationship`)
          return null
        }

        return {
          edited_image_id: data.id,
          source_image_id: sourceImageDbId,
          source_order: index
        }
      })

      const sourceRelations = (await Promise.all(sourceImagePromises)).filter(Boolean)

      if (sourceRelations.length > 0) {
        const { error: relationError } = await supabase
          .from('image_source_relations')
          .insert(sourceRelations)

        if (relationError) {
          console.error('[SAVE IMAGE] Error saving source image relationships:', relationError)
          // Don't fail the main save operation if relationships fail
        } else {
          console.log(`[SAVE IMAGE] Successfully saved ${sourceRelations.length} source image relationships`)
        }
      }
    }

    return data
  } catch (error: any) {
    // Log all errors for debugging
    console.error('[SAVE IMAGE] Error saving image:', error)
    console.error('[SAVE IMAGE] Error details:', {
      message: error.message || 'Unknown error',
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    return null
  }
}

// Get images for a chat
export async function getChatImages(chatId: string): Promise<StoredImage[]> {
  if (!isPersistenceConfigured() || !supabase) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error: any) {
    // Only log if it's not a connection error
    if (!error.message?.includes('fetch failed')) {
      console.error('Error fetching chat images:', error)
    }
    return []
  }
}

// Get all images (for gallery)
export async function getAllImages(limit = 100): Promise<StoredImage[]> {
  if (!isPersistenceConfigured() || !supabase) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error: any) {
    // Only log if it's not a connection error
    if (!error.message?.includes('fetch failed')) {
      console.error('Error fetching all images:', error)
    }
    return []
  }
}

// Get a single image by its local ID (from metadata)
export async function getImageByLocalId(localId: string): Promise<StoredImage | null> {
  if (!isPersistenceConfigured() || !supabase) {
    return null
  }

  try {
    console.log('[GET IMAGE BY LOCAL ID] Searching for:', localId)

    const { data, error } = await supabase
      .from('images')
      .select('*')
      .eq('metadata->>localId', localId)
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('[GET IMAGE BY LOCAL ID] Image not found')
        return null
      }
      throw error
    }

    console.log('[GET IMAGE BY LOCAL ID] Found image:', data?.id)
    return data
  } catch (error: any) {
    console.error('[GET IMAGE BY LOCAL ID] Error:', error)
    return null
  }
}

// Delete an image
export async function deleteImage(imageId: string): Promise<boolean> {
  if (!isPersistenceConfigured() || !supabase) {
    console.log('[DELETE IMAGE] Persistence not configured')
    return false
  }

  try {
    console.log('[DELETE IMAGE] Attempting to delete image from database:', imageId)
    console.log('[DELETE IMAGE] ID type:', typeof imageId, 'ID length:', imageId.length)

    // Check if the imageId is a valid UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(imageId)
    console.log('[DELETE IMAGE] Is UUID format:', isUUID)

    let image: any = null
    let fetchError: any = null

    if (isUUID) {
      // Try to find by UUID
      console.log('[DELETE IMAGE] Searching by UUID...')
      const result = await supabase
        .from('images')
        .select('id, url, metadata')
        .eq('id', imageId)
        .single()

      image = result.data
      fetchError = result.error
      
      if (fetchError) {
        console.log('[DELETE IMAGE] UUID search error:', fetchError.code, fetchError.message)
      } else {
        console.log('[DELETE IMAGE] Found by UUID')
      }
    } else {
      // Skip UUID search and force metadata search for non-UUID IDs
      fetchError = { code: 'PGRST116' } // Simulate not found error
      console.log('[DELETE IMAGE] Not a UUID, will search in metadata')
    }

    // If not found by UUID, try to find by local ID in metadata
    if (fetchError && fetchError.code === 'PGRST116') {
      console.log('[DELETE IMAGE] Not found by UUID, trying by local ID in metadata')
      
      // Try multiple query approaches for better compatibility
      let searchResult = await supabase
        .from('images')
        .select('id, url, metadata')
        .eq('metadata->>localId', imageId)
        .limit(1)
      
      console.log('[DELETE IMAGE] First metadata search result:', searchResult.error?.message || 'Success')
      
      if (searchResult.error || !searchResult.data || searchResult.data.length === 0) {
        // Try with different syntax
        console.log('[DELETE IMAGE] Trying alternative metadata query syntax...')
        searchResult = await supabase
          .from('images')
          .select('id, url, metadata')
          .filter('metadata->localId', 'eq', `"${imageId}"`)
          .limit(1)
          
        console.log('[DELETE IMAGE] Alternative search result:', searchResult.error?.message || 'Success')
      }

      if (!searchResult.error && searchResult.data && searchResult.data.length > 0) {
        image = searchResult.data[0]
        console.log('[DELETE IMAGE] Found image by local ID, database ID:', image.id)
      } else {
        // Last attempt: Try raw SQL query if RPC function exists
        console.log('[DELETE IMAGE] Trying RPC function as last resort...')
        try {
          const { data: rawImages, error: rawError } = await supabase.rpc('get_image_by_local_id', { 
            local_id: imageId 
          })
          
          if (!rawError && rawImages && rawImages.length > 0) {
            image = rawImages[0]
            console.log('[DELETE IMAGE] Found image by RPC function')
          } else {
            console.log('[DELETE IMAGE] RPC function error:', rawError?.message || 'No results')
          }
        } catch (rpcError: any) {
          console.log('[DELETE IMAGE] RPC function not available:', rpcError.message)
        }
        
        if (!image) {
          // Log some recent images to help debug
          const { data: recentImages } = await supabase
            .from('images')
            .select('id, metadata')
            .order('created_at', { ascending: false })
            .limit(5)
          
          console.log('[DELETE IMAGE] Recent images for debugging:', 
            recentImages?.map(img => ({
              id: img.id,
              localId: img.metadata?.localId,
              hasMetadata: !!img.metadata
            }))
          )
          
          throw new Error(`Image not found with ID: ${imageId}`)
        }
      }
    } else if (fetchError) {
      throw fetchError
    }

    if (!image) {
      console.error('[DELETE IMAGE] Image not found after all attempts:', imageId)
      return false
    }

    // Delete from database using the actual database ID
    console.log('[DELETE IMAGE] Deleting from database with ID:', image.id)
    const { error } = await supabase
      .from('images')
      .delete()
      .eq('id', image.id)

    if (error) {
      console.error('[DELETE IMAGE] Database delete error:', error)
      throw error
    }

    console.log('[DELETE IMAGE] Successfully deleted from database:', image.id)

    // Clear cache for this chat
    if (image.chat_id) {
      clearChatCache(image.chat_id)
    }

    // Delete from blob storage
    if (image.url) {
      try {
        const { deleteImageFromBlob } = await import('@/lib/storage/blob-storage')
        await deleteImageFromBlob(image.url)
        console.log('[DELETE IMAGE] Deleted from blob storage')
      } catch (err) {
        console.error('[DELETE IMAGE] Failed to delete from blob storage:', err)
        // Don't fail the whole operation if blob deletion fails
      }
    }

    return true
  } catch (error: any) {
    console.error('[DELETE IMAGE] Error deleting image:', {
      imageId: imageId,
      errorMessage: error.message || 'Unknown error',
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint,
      fullError: error
    })
    return false
  }
}

// Search chats (searches both titles and message content)
export async function searchChats(query: string): Promise<ChatSummary[]> {
  if (!isPersistenceConfigured() || !supabase) {
    return []
  }

  try {
    // Try to use the enhanced search function if available
    const { data: enhancedResults, error: enhancedError } = await supabase
      .rpc('search_chats_with_content', { search_query: query })

    if (!enhancedError && enhancedResults) {
      // Convert to ChatSummary format
      return enhancedResults.map((result: any) => ({
        id: result.id,
        title: result.title,
        model: result.model,
        created_at: result.created_at,
        updated_at: result.updated_at,
        user_id: result.user_id,
        message_count: result.message_count,
        image_count: result.image_count,
        video_count: result.video_count,
        last_message_at: result.last_message_at
      }))
    }

    // Fallback to simple title search if function doesn't exist
    console.log('Enhanced search not available, using title search only')
    const { data, error } = await supabase
      .from('chat_summaries')
      .select('*')
      .or(`title.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return data || []
  } catch (error: any) {
    // Only log if it's not a connection error
    if (!error.message?.includes('fetch failed')) {
      console.error('Error searching chats:', error)
    }
    return []
  }
}

// Save video to database
export async function saveVideo(
  video: GeneratedVideo,
  chatId?: string,
  messageId?: string
): Promise<StoredVideo | null> {
  if (!isPersistenceConfigured() || !supabase) {
    console.log('[SAVE VIDEO] Persistence not configured')
    return null
  }

  console.log('[SAVE VIDEO] Starting save for video:', {
    id: video.id,
    model: video.model,
    status: video.status,
    prompt: video.prompt,
    duration: video.duration,
    chatId: chatId
  })

  try {
    // Ensure the chat exists and get the proper ID
    let properChatId = chatId
    if (chatId) {
      properChatId = await ensureChatExists(chatId)
    }
    
    // Calculate final elapsed time if completed
    let finalElapsedTime: number | undefined
    if (video.status === 'completed' && video.createdAt && video.completedAt) {
      // Ensure dates are Date objects
      const createdAt = video.createdAt instanceof Date ? video.createdAt : new Date(video.createdAt)
      const completedAt = video.completedAt instanceof Date ? video.completedAt : new Date(video.completedAt)
      finalElapsedTime = Math.floor((completedAt.getTime() - createdAt.getTime()) / 1000)
    }

    // Save to database
    const insertData = {
      chat_id: properChatId,
      message_id: messageId,
      url: video.url,
      thumbnail_url: video.thumbnailUrl,
      prompt: video.prompt,
      duration: video.duration,
      aspect_ratio: video.aspectRatio,
      model: video.model,
      source_image_url: video.sourceImage,
      status: video.status,
      final_elapsed_time: finalElapsedTime || video.finalElapsedTime,
      error_message: video.error,
      completed_at: video.completedAt ?
        (video.completedAt instanceof Date ? video.completedAt.toISOString() : new Date(video.completedAt).toISOString()) :
        undefined,
      metadata: {
        localId: video.id,
        timestamp: video.createdAt,
      },
    }

    console.log('[SAVE VIDEO] Inserting to database:', insertData)

    const { data, error } = await supabase
      .from('videos')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('[SAVE VIDEO] Database insert error:', error)
      throw error
    }

    console.log('[SAVE VIDEO] Successfully saved to database:', data)
    return data
  } catch (error: any) {
    // Log all errors for debugging
    console.error('[SAVE VIDEO] Error saving video:', error)
    console.error('[SAVE VIDEO] Error details:', {
      message: error.message || 'Unknown error',
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    return null
  }
}

// Get videos for a chat
export async function getChatVideos(chatId: string): Promise<StoredVideo[]> {
  if (!isPersistenceConfigured() || !supabase) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error: any) {
    // Only log if it's not a connection error
    if (!error.message?.includes('fetch failed')) {
      console.error('Error fetching chat videos:', error)
    }
    return []
  }
}

// Get all videos (for gallery)
export async function getAllVideos(limit = 100): Promise<StoredVideo[]> {
  if (!isPersistenceConfigured() || !supabase) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error: any) {
    // Only log if it's not a connection error
    if (!error.message?.includes('fetch failed')) {
      console.error('Error fetching all videos:', error)
    }
    return []
  }
}

// Delete a video
export async function deleteVideo(videoId: string): Promise<boolean> {
  if (!isPersistenceConfigured() || !supabase) {
    return false
  }

  try {
    // Get video URL first for cleanup
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('url')
      .eq('id', videoId)
      .single()

    if (fetchError) throw fetchError

    // Delete from database
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId)

    if (error) throw error

    // Note: Videos are typically hosted on external services (like Replicate)
    // so we don't need to delete from blob storage like we do with images

    return true
  } catch (error: any) {
    // Only log if it's not a connection error
    if (!error.message?.includes('fetch failed')) {
      console.error('Error deleting video:', error)
    }
    return false
  }
}

// Get source images for a multi-image edit
export async function getSourceImagesForEdit(editedImageId: string): Promise<StoredImage[]> {
  if (!isPersistenceConfigured() || !supabase) {
    return []
  }

  try {
    console.log('[GET SOURCE IMAGES] Fetching source images for:', editedImageId)

    // First get the database ID if we're given a local ID
    let dbImageId = editedImageId

    // Check if it's a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(editedImageId)
    if (!isUUID) {
      // Try to find by local ID
      const editedImage = await getImageByLocalId(editedImageId)
      if (!editedImage) {
        console.log('[GET SOURCE IMAGES] Edited image not found by local ID')
        return []
      }
      dbImageId = editedImage.id
    }

    // Use the RPC function to get source images
    const { data, error } = await supabase
      .rpc('get_source_images', { edited_id: dbImageId })

    if (error) {
      console.error('[GET SOURCE IMAGES] Error fetching source images:', error)
      return []
    }

    console.log(`[GET SOURCE IMAGES] Found ${data?.length || 0} source images`)

    // Convert the RPC result to StoredImage format
    if (!data || data.length === 0) return []

    // Fetch full image data for each source
    const sourceImageIds = data.map((d: any) => d.image_id)
    const { data: fullImages, error: fetchError } = await supabase
      .from('images')
      .select('*')
      .in('id', sourceImageIds)

    if (fetchError) {
      console.error('[GET SOURCE IMAGES] Error fetching full image data:', fetchError)
      return []
    }

    // Sort by source_order
    const orderedImages = data.map((sourceData: any) => {
      const fullImage = fullImages.find((img: any) => img.id === sourceData.image_id)
      return fullImage
    }).filter(Boolean)

    return orderedImages
  } catch (error: any) {
    console.error('[GET SOURCE IMAGES] Error:', error)
    return []
  }
}
