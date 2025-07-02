import { NextRequest, NextResponse } from 'next/server'
import { deleteImage, getImageByLocalId } from '@/lib/services/chat-persistence'
import { isPersistenceConfigured } from '@/lib/database/supabase'
import { supabase } from '@/lib/database/supabase'

// DELETE /api/images/[id] - Delete an image
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let resolvedParams: { id: string } | null = null
  
  try {
    // Handle Next.js 15 async params
    resolvedParams = await context.params
    const imageId = decodeURIComponent(resolvedParams.id)

    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      )
    }

    console.log('[API] DELETE /api/images/[id] - Starting deletion process:', {
      rawId: resolvedParams.id,
      decodedId: imageId,
      idLength: imageId.length,
      idType: typeof imageId,
      isPersistenceConfigured: isPersistenceConfigured()
    })

    // If persistence is not configured, we can't delete from database
    // But we return success to allow client-side localStorage deletion
    if (!isPersistenceConfigured()) {
      console.log('[API] Persistence not configured - returning success for client-side deletion')
      return NextResponse.json({
        success: true,
        message: 'Image deleted successfully (localStorage only)',
        deletedId: imageId,
        deletedFrom: 'localStorage'
      })
    }

    // Check if imageId is a UUID or local ID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(imageId)
    console.log('[API] ID format check - Is UUID:', isUUID)

    let actualDatabaseId = imageId
    
    // If it's not a UUID, it's likely a local ID - we need to find the actual database ID
    if (!isUUID && supabase) {
      console.log('[API] Not a UUID, searching for image by local ID...')
      
      // Try to find the image by local ID in metadata
      const imageData = await getImageByLocalId(imageId)
      
      if (imageData) {
        actualDatabaseId = imageData.id
        console.log('[API] Found image by local ID, database UUID:', actualDatabaseId)
      } else {
        // If getImageByLocalId didn't work, try direct queries
        console.log('[API] getImageByLocalId failed, trying direct queries...')
        
        // Try multiple query methods
        const queries = [
          // Method 1: Standard JSON operator
          supabase
            .from('images')
            .select('id, metadata')
            .eq('metadata->>localId', imageId)
            .limit(1),
          
          // Method 2: Filter with JSON path
          supabase
            .from('images')
            .select('id, metadata')
            .filter('metadata->localId', 'eq', `"${imageId}"`)
            .limit(1),
            
          // Method 3: Text search in metadata (less efficient but more flexible)
          supabase
            .from('images')
            .select('id, metadata')
            .filter('metadata', 'cs', `{"localId":"${imageId}"}`)
            .limit(1)
        ]
        
        for (let i = 0; i < queries.length; i++) {
          try {
            console.log(`[API] Trying query method ${i + 1}...`)
            const { data, error } = await queries[i]
            
            if (!error && data && data.length > 0) {
              actualDatabaseId = data[0].id
              console.log(`[API] Found image with query method ${i + 1}, database UUID:`, actualDatabaseId)
              break
            } else if (error) {
              console.log(`[API] Query method ${i + 1} error:`, error.message)
            } else {
              console.log(`[API] Query method ${i + 1} returned no results`)
            }
          } catch (queryError: any) {
            console.log(`[API] Query method ${i + 1} exception:`, queryError.message)
          }
        }
        
        // If still not found, check if there's an RPC function available
        if (actualDatabaseId === imageId && !isUUID) {
          try {
            console.log('[API] Trying RPC function as last resort...')
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_image_by_local_id', { 
              local_id: imageId 
            })
            
            if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
              actualDatabaseId = rpcData[0].id
              console.log('[API] Found image via RPC function, database UUID:', actualDatabaseId)
            } else if (rpcError) {
              console.log('[API] RPC function error:', rpcError.message)
            }
          } catch (rpcException: any) {
            console.log('[API] RPC function not available:', rpcException.message)
          }
        }
      }
      
      // Log debug info if we couldn't find the image
      if (actualDatabaseId === imageId && !isUUID) {
        console.log('[API] Could not find database ID for local ID:', imageId)
        
        // Get some recent images for debugging
        const { data: recentImages } = await supabase
          .from('images')
          .select('id, metadata, created_at')
          .order('created_at', { ascending: false })
          .limit(3)
        
        console.log('[API] Recent images for debugging:')
        recentImages?.forEach((img, idx) => {
          console.log(`  ${idx + 1}. ID: ${img.id.substring(0, 8)}...`)
          console.log(`     Metadata:`, img.metadata)
          console.log(`     Local ID:`, img.metadata?.localId || 'NOT SET')
        })
      }
    }

    // Now try to delete with the actual database ID
    console.log('[API] Attempting to delete with database ID:', actualDatabaseId)
    const success = await deleteImage(actualDatabaseId)

    if (!success) {
      console.log('[API] Image not found in database, but returning success for localStorage deletion')
      console.log('[API] Original ID:', imageId, 'Database ID attempted:', actualDatabaseId)
      
      // Return success anyway to allow client-side localStorage deletion
      // This handles cases where the image only exists in localStorage
      return NextResponse.json({
        success: true,
        message: 'Image deleted successfully (localStorage only)',
        deletedId: imageId,
        deletedFrom: 'localStorage',
        note: 'Image was not found in database but can be deleted from localStorage'
      })
    }

    console.log('[API] Successfully deleted image:', {
      requestedId: imageId,
      databaseId: actualDatabaseId,
      wasLocalId: !isUUID && actualDatabaseId !== imageId
    })

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
      deletedId: imageId,
      deletedFrom: 'database',
      databaseId: actualDatabaseId
    })
  } catch (error: any) {
    console.error('[API] Error in DELETE /api/images/[id]:', {
      error: error.message,
      stack: error.stack,
      params: resolvedParams
    })
    return NextResponse.json(
      {
        error: 'Failed to delete image',
        details: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}