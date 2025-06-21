import { NextRequest, NextResponse } from 'next/server'
import { deleteImage } from '@/lib/services/chat-persistence'

// DELETE /api/images/[id] - Delete an image
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    // Handle both Next.js 14 and 15 params format
    const resolvedParams = 'then' in context.params ? await context.params : context.params
    const imageId = decodeURIComponent(resolvedParams.id)
    
    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      )
    }

    console.log('[API] DELETE /api/images/[id] - Attempting to delete image:', {
      rawId: resolvedParams.id,
      decodedId: imageId,
      idLength: imageId.length,
      idType: typeof imageId
    })
    
    // Call the deleteImage function which handles both database and blob storage deletion
    const success = await deleteImage(imageId)
    
    if (!success) {
      console.error('[API] deleteImage returned false for ID:', imageId)
      return NextResponse.json(
        { 
          error: 'Image not found or could not be deleted',
          details: `Image with ID ${imageId} was not found in the database` 
        },
        { status: 404 }
      )
    }
    
    console.log('[API] Successfully deleted image:', imageId)
    
    return NextResponse.json({ 
      success: true,
      message: 'Image deleted successfully',
      deletedId: imageId
    })
  } catch (error: any) {
    console.error('[API] Error in DELETE /api/images/[id]:', {
      error: error.message,
      stack: error.stack,
      imageId: resolvedParams.id
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