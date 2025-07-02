import { NextRequest, NextResponse } from "next/server"
import { createSupabaseClient } from "@/lib/database/supabase"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const fileType = searchParams.get('fileType')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Try to fetch from database
    try {
      const supabase = createSupabaseClient()
      
      let query = supabase
        .from('content_library')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1)

      // Add file type filter if specified
      if (fileType) {
        query = query.eq('file_type', fileType)
      }

      // Filter by user if auth is configured
      // In a real app, we'd get the user ID from auth
      // query = query.eq('user_id', userId)

      const { data, error, count } = await query

      if (error) {
        console.error('[ContentLibrary List] Database error:', error)
        throw error
      }

      return NextResponse.json({
        success: true,
        items: data || [],
        total: count || 0,
        limit,
        offset
      })
    } catch (dbError) {
      console.error('[ContentLibrary List] Database error:', dbError)
      
      // Return empty list if database is not configured
      return NextResponse.json({
        success: true,
        items: [],
        total: 0,
        limit,
        offset,
        message: 'Database not configured'
      })
    }
  } catch (error) {
    console.error('[ContentLibrary List] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch content library',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}