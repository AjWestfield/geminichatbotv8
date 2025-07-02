import { supabase } from '@/lib/database/supabase'
import { Chat, Message, StoredImage, StoredVideo, GeneratedImage, GeneratedVideo } from '@/types/chat'
// Temporarily disabled to fix chat loading
// import { getChatImagesWithOriginals } from './chat-images-with-originals'

// Cache for recently accessed chats
const chatCache = new Map<string, { data: any, timestamp: number }>()
const CACHE_TTL = 60000 // 1 minute cache

export async function getChat(chatId: string): Promise<{
  chat: Chat
  messages: Message[]
  images: StoredImage[]
  videos: StoredVideo[]
  canvasState: any
  messagesPagination?: {
    total: number
    loaded: number
    hasMore: boolean
    offset: number
    error?: string
  }
} | null> {
  console.log('[CHAT PERSISTENCE OPTIMIZED] Loading chat:', chatId)
  
  // Check if supabase is configured
  if (!supabase) {
    console.log('[CHAT PERSISTENCE OPTIMIZED] Supabase not configured, returning null')
    return null
  }
  
  // Check cache first
  const cached = chatCache.get(chatId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[CHAT PERSISTENCE OPTIMIZED] Returning cached chat')
    return cached.data
  }

  try {
    // Load all data in parallel for maximum speed
    const [chatResult, messagesResult, imagesResult, videosResult] = await Promise.allSettled([
      // Chat details
      supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single(),
      
      // Messages - load more initially for better UX
      supabase
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
        .order('created_at', { ascending: true })
        .limit(50), // Load 50 messages initially
      
      // Images - reverted to original method to fix chat loading
      supabase
        .from('images')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true }),
      
      // Videos
      supabase
        .from('videos')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
    ])

    // Handle chat result
    if (chatResult.status === 'rejected' || chatResult.value.error) {
      console.error('[CHAT PERSISTENCE OPTIMIZED] Error fetching chat:', chatResult)
      throw new Error('Failed to load chat')
    }
    
    const chat = chatResult.value.data
    if (!chat) {
      console.error('[CHAT PERSISTENCE OPTIMIZED] Chat not found:', chatId)
      return null
    }

    // Handle messages result
    let messages: Message[] = []
    let messagesPagination = {
      total: -1,
      loaded: 0,
      hasMore: false,
      offset: 0
    }
    
    if (messagesResult.status === 'fulfilled' && !messagesResult.value.error) {
      messages = messagesResult.value.data || []
      messagesPagination = {
        total: messages.length,
        loaded: messages.length,
        hasMore: messages.length === 50, // If we got exactly 50, there might be more
        offset: 0
      }
      console.log('[CHAT PERSISTENCE OPTIMIZED] Loaded', messages.length, 'messages')
    } else {
      console.warn('[CHAT PERSISTENCE OPTIMIZED] Failed to load messages:', messagesResult)
    }

    // Handle images result
    let images: StoredImage[] = []
    if (imagesResult.status === 'fulfilled' && !imagesResult.value.error) {
      images = imagesResult.value.data || []
      console.log('[CHAT PERSISTENCE OPTIMIZED] Loaded', images.length, 'images')
    } else {
      console.warn('[CHAT PERSISTENCE OPTIMIZED] Failed to load images:', imagesResult)
    }

    // Handle videos result
    let videos: StoredVideo[] = []
    if (videosResult.status === 'fulfilled' && !videosResult.value.error) {
      videos = videosResult.value.data || []
      console.log('[CHAT PERSISTENCE OPTIMIZED] Loaded', videos.length, 'videos')
    } else {
      console.warn('[CHAT PERSISTENCE OPTIMIZED] Failed to load videos:', videosResult)
    }

    const result = {
      chat,
      messages,
      images,
      videos,
      canvasState: (chat as any).canvas_state || {},
      messagesPagination
    }

    // Cache the result
    chatCache.set(chatId, { data: result, timestamp: Date.now() })
    
    return result
  } catch (error) {
    console.error('[CHAT PERSISTENCE OPTIMIZED] Error loading chat:', error)
    throw error
  }
}

// Function to clear cache for a specific chat
export function clearChatCache(chatId?: string) {
  if (chatId) {
    chatCache.delete(chatId)
  } else {
    chatCache.clear()
  }
}

// Function to preload a chat in the background
export async function preloadChat(chatId: string) {
  // Don't await, just fire and forget
  getChat(chatId).catch(err => 
    console.warn('[CHAT PERSISTENCE OPTIMIZED] Preload failed:', err)
  )
}
