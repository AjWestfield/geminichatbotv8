import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    
    // Simple mock response for testing
    const mockResponse = {
      success: true,
      title: "Me at the zoo",
      duration: "0:19",
      quality: "240p",
      fileUri: "https://generativelanguage.googleapis.com/v1beta/files/mock-file-123",
      file: {
        name: "files/mock-file-123",
        displayName: "Me at the zoo",
        mimeType: "video/mp4",
        sizeBytes: 608256,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        sha256Hash: "mock-hash",
        uri: "https://generativelanguage.googleapis.com/v1beta/files/mock-file-123",
        state: "ACTIVE",
        videoMetadata: {
          videoDuration: "19s"
        }
      }
    }
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    return NextResponse.json(mockResponse)
    
  } catch (error) {
    console.error('[YouTube Download API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process YouTube download' },
      { status: 500 }
    )
  }
}
