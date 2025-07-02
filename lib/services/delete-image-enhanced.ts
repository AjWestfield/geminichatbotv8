// Enhanced deleteImage function with better error handling and ID matching
export async function deleteImage(imageId: string): Promise<boolean> {
  if (!isPersistenceConfigured() || !supabase) {
    console.log('[DELETE IMAGE] Persistence not configured')
    return false
  }

  try {
    console.log('[DELETE IMAGE] Attempting to delete image from database:', imageId)

    // Try multiple methods to find the image
    let image: any = null
    
    // Method 1: Direct ID match (could be UUID or string)
    const { data: directMatch, error: directError } = await supabase
      .from('images')
      .select('id, url, metadata')
      .or(`id.eq.${imageId},metadata->>localId.eq.${imageId}`)
      .limit(1)
      .single()

    if (!directError && directMatch) {
      image = directMatch
      console.log('[DELETE IMAGE] Found image by direct match:', image.id)
    }

    // Method 2: If not found, try case-insensitive search in metadata
    if (!image) {
      const { data: metadataMatches, error: metadataError } = await supabase
        .from('images')
        .select('id, url, metadata')
        .ilike('metadata->>localId', imageId)
        .limit(1)

      if (!metadataError && metadataMatches && metadataMatches.length > 0) {
        image = metadataMatches[0]
        console.log('[DELETE IMAGE] Found image by case-insensitive metadata match:', image.id)
      }
    }

    // Method 3: Try partial match if ID might be truncated
    if (!image && imageId.length > 8) {
      const partialId = imageId.substring(0, 8)
      const { data: partialMatches, error: partialError } = await supabase
        .from('images')
        .select('id, url, metadata')
        .or(`id.ilike.${partialId}%,metadata->>localId.ilike.${partialId}%`)
        .limit(1)

      if (!partialError && partialMatches && partialMatches.length > 0) {
        image = partialMatches[0]
        console.log('[DELETE IMAGE] Found image by partial match:', image.id)
      }
    }

    if (!image) {
      console.error('[DELETE IMAGE] Image not found with any method:', imageId)
      
      // Log all recent images to help debug
      const { data: recentImages } = await supabase
        .from('images')
        .select('id, metadata')
        .order('created_at', { ascending: false })
        .limit(5)
      
      console.log('[DELETE IMAGE] Recent images for debugging:', 
        recentImages?.map(img => ({
          id: img.id,
          localId: img.metadata?.localId
        }))
      )
      
      return false
    }

    // Delete from database using the actual database ID
    const { error } = await supabase
      .from('images')
      .delete()
      .eq('id', image.id)

    if (error) throw error

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
