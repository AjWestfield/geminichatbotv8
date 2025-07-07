import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('url');
    const uri = req.nextUrl.searchParams.get('uri'); // Support 'uri' parameter as well
    const geminiUri = req.nextUrl.searchParams.get('geminiUri') || uri; // Use 'uri' as fallback
    
    if (!url && !geminiUri) {
      return NextResponse.json({ error: 'No video URL provided' }, { status: 400 });
    }
    
    // If it's a regular URL, just proxy it
    if (url) {
      const response = await fetch(url);
      const blob = await response.blob();
      
      return new NextResponse(blob, {
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
    
    // For Gemini URIs, we need to fetch from Google's API with authentication
    if (geminiUri) {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      
      if (!geminiApiKey) {
        console.error('[Video Proxy] GEMINI_API_KEY not configured');
        return NextResponse.json({ 
          error: 'Gemini API key not configured' 
        }, { status: 500 });
      }
      
      try {
        // Append API key to the URI
        const authenticatedUri = geminiUri.includes('?') 
          ? `${geminiUri}&key=${geminiApiKey}`
          : `${geminiUri}?key=${geminiApiKey}`;
        
        const response = await fetch(authenticatedUri, {
          headers: {
            'Accept': 'video/*,application/octet-stream,*/*'
          }
        });
        
        if (!response.ok) {
          console.error('[Video Proxy] Gemini fetch failed:', response.status, response.statusText);
          return NextResponse.json({ 
            error: `Failed to fetch Gemini video: ${response.status} ${response.statusText}` 
          }, { status: response.status });
        }
        
        const blob = await response.blob();
        const contentType = response.headers.get('Content-Type') || 'video/mp4';
        
        console.log('[Video Proxy] Successfully fetched Gemini video:', {
          uri: geminiUri,
          contentType,
          size: blob.size
        });
        
        return new NextResponse(blob, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600'
          }
        });
      } catch (fetchError) {
        console.error('[Video Proxy] Error fetching Gemini URI:', fetchError);
        return NextResponse.json({ 
          error: 'Failed to fetch video from Gemini' 
        }, { status: 500 });
      }
    }
    
  } catch (error) {
    console.error('[Video Proxy] Error:', error);
    return NextResponse.json({ error: 'Failed to proxy video' }, { status: 500 });
  }
}
