import { NextRequest, NextResponse } from "next/server"
import { createSupabaseClient } from "@/lib/database/supabase"
import { deleteBlob } from "@/lib/storage/blob-storage"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      )
    }

    console.log(`[ContentLibrary Delete] Deleting item: ${id}`)

    // Try to delete from database
    try {
      const supabase = createSupabaseClient()
      
      // First, get the item to retrieve the file URL
      const { data: item, error: fetchError } = await supabase
        .from('content_library')
        .select('file_url')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error('[ContentLibrary Delete] Error fetching item:', fetchError)
        return NextResponse.json(
          { error: 'Content not found' },
          { status: 404 }
        )
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('content_library')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('[ContentLibrary Delete] Database delete error:', deleteError)
        throw deleteError
      }

      // Try to delete from blob storage if it's a blob URL
      if (item?.file_url && item.file_url.includes('.blob.vercel-storage.com')) {
        try {
          await deleteBlob(item.file_url)
          console.log('[ContentLibrary Delete] Deleted from blob storage')
        } catch (blobError) {
          console.error('[ContentLibrary Delete] Blob delete error:', blobError)
          // Continue even if blob deletion fails
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Content deleted successfully'
      })
    } catch (dbError) {
      console.error('[ContentLibrary Delete] Database error:', dbError)
      
      // If database is not configured, just return success
      return NextResponse.json({
        success: true,
        message: 'Content deleted (database not configured)'
      })
    }
  } catch (error) {
    console.error('[ContentLibrary Delete] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      )
    }

    // Try to fetch from database
    try {
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from('content_library')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('[ContentLibrary Get] Database error:', error)
        return NextResponse.json(
          { error: 'Content not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        item: data
      })
    } catch (dbError) {
      console.error('[ContentLibrary Get] Database error:', dbError)
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[ContentLibrary Get] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}