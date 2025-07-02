import { NextRequest, NextResponse } from "next/server"
import { createSupabaseClient } from "@/lib/database/supabase"
import { ZapierMCPClient } from "@/lib/mcp/zapier-mcp-client"
import { isZapierMCPConfigured } from "@/lib/mcp/zapier-mcp-config"

interface PlatformSettings {
  enabled: boolean
  caption?: string
  title?: string
  description?: string
  hashtags?: string[]
  scheduledTime?: string
  platformSpecific?: Record<string, any>
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { contentId, platforms } = body

    if (!contentId) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      )
    }

    if (!platforms || typeof platforms !== 'object') {
      return NextResponse.json(
        { error: 'Platform settings are required' },
        { status: 400 }
      )
    }

    // Check if Zapier MCP is configured
    if (!isZapierMCPConfigured()) {
      return NextResponse.json(
        { error: 'Zapier MCP is not configured' },
        { status: 400 }
      )
    }

    console.log(`[ContentLibrary Publish] Publishing content ${contentId} to platforms`)

    // Get content item from database
    let contentItem: any
    try {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase
        .from('content_library')
        .select('*')
        .eq('id', contentId)
        .single()

      if (error || !data) {
        return NextResponse.json(
          { error: 'Content not found' },
          { status: 404 }
        )
      }

      contentItem = data
    } catch (error) {
      console.error('[ContentLibrary Publish] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch content' },
        { status: 500 }
      )
    }

    // Initialize Zapier MCP client
    const zapierClient = ZapierMCPClient.getInstance()
    
    // Track results for each platform
    const platformResults: Record<string, any> = {}

    // Process each enabled platform
    for (const [platformId, settings] of Object.entries(platforms)) {
      const platformSettings = settings as PlatformSettings
      
      if (!platformSettings.enabled) {
        continue
      }

      console.log(`[ContentLibrary Publish] Publishing to ${platformId}`)

      try {
        // Publish to platform
        const publishResult = await zapierClient.publish(platformId, {
          contentUrl: contentItem.file_url,
          contentType: contentItem.file_type,
          platform: platformId,
          caption: platformSettings.caption,
          title: platformSettings.title,
          description: platformSettings.description,
          hashtags: platformSettings.hashtags,
          metadata: platformSettings.platformSpecific
        })

        platformResults[platformId] = {
          status: publishResult.success ? 'success' : 'error',
          message: publishResult.error,
          platformPostId: publishResult.platformPostId,
          platformUrl: publishResult.platformUrl,
          details: publishResult.details
        }

        // Save publishing history
        try {
          const supabase = createSupabaseClient()
          await supabase.from('publishing_history').insert({
            content_id: contentId,
            platform: platformId,
            status: publishResult.success ? 'published' : 'failed',
            published_at: publishResult.success ? new Date().toISOString() : null,
            platform_post_id: publishResult.platformPostId,
            platform_url: publishResult.platformUrl,
            error_message: publishResult.error,
            metadata: publishResult.details
          })

          // Update content item platforms field
          const updatedPlatforms = { ...contentItem.platforms }
          updatedPlatforms[platformId] = {
            published: publishResult.success,
            publishedAt: new Date().toISOString(),
            postId: publishResult.platformPostId,
            url: publishResult.platformUrl
          }

          await supabase
            .from('content_library')
            .update({ platforms: updatedPlatforms })
            .eq('id', contentId)
        } catch (dbError) {
          console.error('[ContentLibrary Publish] Error saving history:', dbError)
          // Continue even if database save fails
        }
      } catch (error) {
        console.error(`[ContentLibrary Publish] Error publishing to ${platformId}:`, error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        // Check for specific error patterns to provide better user feedback
        let friendlyMessage = errorMessage
        if (errorMessage.includes('No suitable publishing tool')) {
          friendlyMessage = 'Publishing tools not available. Please check your Zapier configuration.'
        } else if (errorMessage.includes('not connected') || errorMessage.includes('authentication')) {
          friendlyMessage = `${platformId} account not connected. Please connect it in your Zapier dashboard.`
        } else if (errorMessage.includes('Failed to connect')) {
          friendlyMessage = 'Unable to connect to Zapier. Please check your API credentials.'
        } else if (errorMessage.includes('PLATFORM_NOT_CONNECTED')) {
          friendlyMessage = `Please connect your ${platformId} account through Zapier before publishing.`
        }
        
        platformResults[platformId] = {
          status: 'error',
          message: friendlyMessage,
          details: errorMessage
        }
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      contentId,
      platformResults
    })

  } catch (error) {
    console.error('[ContentLibrary Publish] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to publish content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}