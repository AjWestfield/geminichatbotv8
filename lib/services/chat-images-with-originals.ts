import { supabase, isPersistenceConfigured } from '@/lib/database/supabase'
import { StoredImage } from '@/lib/database/supabase'
import { StoredImageWithOriginalFlag } from '@/types/extended-image-types'

// Enhanced function to get images for a chat including originals for comparison
export async function getChatImagesWithOriginals(chatId: string): Promise<StoredImage[]> {
  if (!isPersistenceConfigured() || !supabase) {
    return []
  }

  try {
    console.log('[CHAT IMAGES] Fetching images with originals for chat:', chatId)
    
    // Use the new database function that includes original images
    const { data, error } = await supabase
      .rpc('get_chat_images_with_originals', { p_chat_id: chatId })

    if (error) {
      console.error('[CHAT IMAGES] Error fetching images with originals:', error)
      
      // Always fallback to regular query on any error
      console.log('[CHAT IMAGES] Falling back to regular query')
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('images')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
      
      if (fallbackError) {
        console.error('[CHAT IMAGES] Fallback query also failed:', fallbackError)
        return []
      }
      return fallbackData || []
    }

    // Filter out any null results and ensure proper typing
    const imagesWithFlags = (data || []).filter(img => img !== null) as StoredImageWithOriginalFlag[]
    
    // Convert back to StoredImage type (without the is_original_for_edit flag)
    const images: StoredImage[] = imagesWithFlags.map(img => {
      const { is_original_for_edit, ...imageData } = img
      return imageData as StoredImage
    })
    
    console.log('[CHAT IMAGES] Loaded images:', {
      total: images.length,
      directChatImages: imagesWithFlags.filter(img => !img.is_original_for_edit).length,
      originalImages: imagesWithFlags.filter(img => img.is_original_for_edit).length,
      editedImages: images.filter(img => img.original_image_id).length
    })

    return images
  } catch (error: any) {
    console.error('[CHAT IMAGES] Error fetching chat images with originals:', error)
    return []
  }
}
