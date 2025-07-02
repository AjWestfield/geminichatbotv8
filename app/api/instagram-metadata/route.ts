import { NextRequest, NextResponse } from "next/server"
import { detectInstagramUrl } from "@/lib/instagram-url-utils"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      )
    }

    // Validate Instagram URL
    const urlInfo = detectInstagramUrl(url)
    if (!urlInfo?.isValid) {
      return NextResponse.json(
        { error: 'Invalid Instagram URL' },
        { status: 400 }
      )
    }

    console.log(`[Instagram Metadata] Fetching metadata for: ${url}`)

    // Try Instagram's oEmbed API first
    try {
      const oembedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=your_access_token`
      
      // Since we don't have a Facebook access token, we'll use a different approach
      // Try to extract basic info from the URL structure
      const metadata = {
        isVideo: urlInfo.type === 'reel' || urlInfo.type === 'video',
        title: `Instagram ${urlInfo.type === 'reel' ? 'Reel' : urlInfo.type === 'story' ? 'Story' : 'Post'}`,
        author: 'Instagram User',
        mediaId: urlInfo.mediaId,
        type: urlInfo.type
      }

      // Try to get thumbnail from Instagram's public API (limited)
      try {
        // This is a simplified approach - in production you'd want to use Instagram Basic Display API
        // or scrape responsibly with proper rate limiting
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 5000
        })

        if (response.ok) {
          const html = await response.text()
          
          // Try to extract thumbnail from meta tags
          const thumbnailMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
          if (thumbnailMatch) {
            metadata.thumbnail = thumbnailMatch[1]
          }

          // Try to extract title
          const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/)
          if (titleMatch) {
            metadata.title = titleMatch[1]
          }

          // Try to extract video duration for reels
          if (urlInfo.type === 'reel') {
            const durationMatch = html.match(/"duration":(\d+)/)
            if (durationMatch) {
              metadata.duration = parseInt(durationMatch[1])
            }
          }
        }
      } catch (scrapeError) {
        console.warn('[Instagram Metadata] Failed to scrape additional data:', scrapeError)
        // Continue with basic metadata
      }

      console.log(`[Instagram Metadata] Returning metadata:`, metadata)
      return NextResponse.json(metadata)

    } catch (error) {
      console.error('[Instagram Metadata] oEmbed API failed:', error)
      
      // Fallback to basic metadata
      const fallbackMetadata = {
        isVideo: urlInfo.type === 'reel' || urlInfo.type === 'video',
        title: `Instagram ${urlInfo.type === 'reel' ? 'Reel' : urlInfo.type === 'story' ? 'Story' : 'Post'}`,
        author: 'Instagram User',
        mediaId: urlInfo.mediaId,
        type: urlInfo.type
      }

      return NextResponse.json(fallbackMetadata)
    }

  } catch (error) {
    console.error('[Instagram Metadata] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Instagram metadata' },
      { status: 500 }
    )
  }
}
