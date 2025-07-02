import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('url');
    const geminiUri = req.nextUrl.searchParams.get('geminiUri');
    
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
    
    // For Gemini URIs, we need a different approach
    // For now, return an error - in production you'd implement Gemini API access
    return NextResponse.json({ 
      error: 'Gemini video playback requires additional implementation' 
    }, { status: 501 });
    
  } catch (error) {
    console.error('[Video Proxy] Error:', error);
    return NextResponse.json({ error: 'Failed to proxy video' }, { status: 500 });
  }
}
