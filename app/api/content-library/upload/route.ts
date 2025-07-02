import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { uploadImageToBlob } from "@/lib/storage/blob-storage"
import { createSupabaseClient } from "@/lib/database/supabase"
import { validateImageUrl } from "@/lib/image-url-validator"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string || file?.name || 'Untitled'
    const description = formData.get('description') as string || ''
    const tags = formData.get('tags') as string || ''

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log(`[ContentLibrary Upload] Processing file: ${file.name}, Type: ${file.type}, Size: ${file.size}`)

    // Determine file type category
    let fileType: 'image' | 'video' | 'audio' | 'document' = 'document'
    if (file.type.startsWith('image/')) fileType = 'image'
    else if (file.type.startsWith('video/')) fileType = 'video'
    else if (file.type.startsWith('audio/')) fileType = 'audio'

    // Convert file to data URL for storage
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'bin'
    const uniqueFilename = `content-library/${nanoid()}.${fileExtension}`

    // Upload to blob storage if configured
    let fileUrl = dataUrl
    let thumbnailUrl: string | undefined

    try {
      fileUrl = await uploadImageToBlob(dataUrl, uniqueFilename)
      console.log('[ContentLibrary Upload] File uploaded to blob storage:', fileUrl)

      // For videos, we might want to generate a thumbnail later
      // For now, we'll use a placeholder
      if (fileType === 'video') {
        thumbnailUrl = undefined // Thumbnail generation can be added later
      } else if (fileType === 'image') {
        thumbnailUrl = fileUrl
      }
    } catch (error) {
      console.error('[ContentLibrary Upload] Blob storage error:', error)
      // Continue with data URL if blob storage fails
    }

    // Extract dimensions for images/videos
    let dimensions: { width: number; height: number } | undefined
    if (fileType === 'image' && typeof window === 'undefined') {
      // Server-side image dimension extraction would go here
      // For now, we'll leave it undefined
    }

    // Parse tags
    const tagArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)

    // Create content library entry
    const contentItem = {
      id: nanoid(),
      user_id: null, // In a real app, this would come from auth
      file_url: fileUrl,
      file_type: fileType,
      mime_type: file.type,
      file_size: file.size,
      title,
      description,
      tags: tagArray,
      platforms: {},
      thumbnail_url: thumbnailUrl,
      dimensions,
      metadata: {
        original_filename: file.name,
        upload_source: 'web_ui'
      }
    }

    // Save to database if configured
    try {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase
        .from('content_library')
        .insert([contentItem])
        .select()
        .single()

      if (error) {
        console.error('[ContentLibrary Upload] Database error:', error)
        // Continue without database if it fails
      } else if (data) {
        console.log('[ContentLibrary Upload] Saved to database:', data.id)
        return NextResponse.json({
          success: true,
          item: data
        })
      }
    } catch (error) {
      console.error('[ContentLibrary Upload] Database connection error:', error)
    }

    // Return the item even if database save failed
    return NextResponse.json({
      success: true,
      item: contentItem
    })

  } catch (error) {
    console.error('[ContentLibrary Upload] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to upload content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}