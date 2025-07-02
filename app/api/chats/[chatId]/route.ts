import { NextRequest, NextResponse } from 'next/server'
import { getChat as getOptimizedChat, clearChatCache, preloadChat } from '@/lib/services/chat-persistence-optimized'
import { updateChatTitle, deleteChat, updateCanvasState } from '@/lib/services/chat-persistence'
import { isPersistenceConfigured } from '@/lib/database/supabase'
import { getLocalStorageChats, getLocalStorageMessages, updateLocalStorageChatTitle, deleteLocalStorageChat } from '@/lib/localStorage-persistence'

// GET /api/chats/[chatId] - Get a specific chat with messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    // Await params properly (Next.js 15 pattern)
    const resolvedParams = await params
    const chatId = resolvedParams?.chatId
    
    console.log('[API] GET /api/chats/[chatId] - Loading chat:', chatId)
    
    if (!chatId || typeof chatId !== 'string' || chatId.trim() === '') {
      console.error('[API] Invalid or missing chatId:', chatId)
      return NextResponse.json(
        { 
          error: 'Invalid chat ID',
          message: 'A valid chat ID is required',
          details: 'Chat ID must be a non-empty string'
        },
        { status: 400 }
      )
    }
    
    // Clean the chatId
    const cleanChatId = chatId.trim()
    
    let chatData = null
    
    try {
      chatData = await getOptimizedChat(cleanChatId)
    } catch (dbError: any) {
      console.error('[API] Database error when fetching chat:', dbError)
      
      // Check if it's a timeout error - if so, return specific error instead of trying fallback
      if (dbError.code === '57014' || dbError.message?.includes('timeout') || dbError.message?.includes('Database timeout')) {
        console.error('[API] Database timeout error - returning specific error response')
        return NextResponse.json(
          { 
            error: 'Database timeout',
            message: 'The chat is taking too long to load due to database performance issues',
            details: 'Please ask your administrator to run database optimization: npm run db:optimize-performance',
            chatId: cleanChatId,
            isTimeout: true
          },
          { status: 504 } // Gateway Timeout
        )
      }
      
      // For other errors, continue to try localStorage fallback
    }
    
    console.log('[API] getChat result:', {
      hasData: !!chatData,
      hasChat: !!chatData?.chat,
      messageCount: chatData?.messages?.length || 0,
      isPersistenceConfigured: isPersistenceConfigured()
    })

    // Try localStorage fallback if no database data (regardless of persistence configuration)
    if (!chatData) {
      console.log('[API] No database data, trying localStorage fallback')
      const chats = getLocalStorageChats()
      const chat = chats.find(c => c.id === cleanChatId)
      
      if (chat) {
        const messages = getLocalStorageMessages(cleanChatId)
        // For localStorage, we don't have images/videos/canvas state stored separately
        chatData = {
          chat,
          messages,
          images: [],
          videos: [],
          canvasState: null
        }
        console.log('[API] Found chat in localStorage:', chat.title)
      }
    }

    if (!chatData || !chatData.chat) {
      console.error('[API] Chat not found:', cleanChatId, {
        persistenceConfigured: isPersistenceConfigured(),
        chatDataReceived: !!chatData,
        hasChatProperty: !!chatData?.chat
      })
      return NextResponse.json(
        { 
          error: 'Chat not found',
          message: `The requested chat with ID ${cleanChatId} was not found`,
          chatId: cleanChatId,
          details: 'The chat may have been deleted or does not exist'
        },
        { status: 404 }
      )
    }

    console.log('[API] Returning chat data:', {
      chatId: chatData.chat.id,
      title: chatData.chat.title,
      messageCount: chatData.messages.length,
      imageCount: chatData.images?.length || 0,
      videoCount: chatData.videos?.length || 0
    })

    return NextResponse.json(chatData)
  } catch (error) {
    console.error('Error in GET /api/chats/[chatId]:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      chatId: cleanChatId,
      persistenceConfigured: isPersistenceConfigured()
    })
    
    // Always return a properly structured error response
    return NextResponse.json(
      { 
        error: 'Failed to fetch chat',
        message: 'An internal error occurred while fetching the chat',
        details: error instanceof Error ? error.message : 'Unknown error',
        chatId: cleanChatId
      },
      { status: 500 }
    )
  }
}

// PATCH /api/chats/[chatId] - Update chat (e.g., title, canvas state)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params
    const body = await req.json()
    const { title, canvasState } = body

    let success = true

    // Update title if provided
    if (title !== undefined) {
      const titleSuccess = await updateChatTitle(chatId, title)
      
      // Use localStorage fallback if persistence not configured
      if (!titleSuccess && !isPersistenceConfigured()) {
        updateLocalStorageChatTitle(chatId, title)
      } else if (!titleSuccess) {
        success = false
      }
    }

    // Update canvas state if provided
    if (canvasState !== undefined && isPersistenceConfigured()) {
      const canvasSuccess = await updateCanvasState(chatId, canvasState)
      if (!canvasSuccess) {
        success = false
      }
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update chat' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/chats/[chatId]:', error)
    return NextResponse.json(
      { error: 'Failed to update chat' },
      { status: 500 }
    )
  }
}

// DELETE /api/chats/[chatId] - Delete a chat
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params
    let success = await deleteChat(chatId)
    
    // Use localStorage fallback if persistence not configured
    if (!success && !isPersistenceConfigured()) {
      deleteLocalStorageChat(chatId)
      success = true
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete chat' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/chats/[chatId]:', error)
    return NextResponse.json(
      { error: 'Failed to delete chat' },
      { status: 500 }
    )
  }
}