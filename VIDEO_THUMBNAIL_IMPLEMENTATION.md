# Video Thumbnail Implementation

This document describes the video thumbnail handling implementation for YouTube, Instagram, and regular video uploads.

## Overview

Video thumbnails are now automatically extracted and displayed for:
- YouTube videos downloaded via the `/api/youtube-download` endpoint
- Instagram videos downloaded via the `/api/instagram-download` endpoint  
- Regular video uploads (generated client-side)

## Implementation Details

### 1. YouTube Thumbnail Extraction

**File**: `/app/api/youtube-download/route.ts`

- Uses `yt-dlp` with the `--write-thumbnail` flag to download video thumbnails
- Looks for thumbnail files with extensions: `.jpg`, `.jpeg`, `.png`, `.webp`
- Converts thumbnails to base64 data URLs for inline display
- Includes thumbnail in API response as `videoThumbnail` field

### 2. Instagram Thumbnail Extraction

**File**: `/app/api/instagram-download/route.ts`

- Extracts `thumbnailUrl` from Instagram's GraphQL API response
- Downloads the thumbnail image and converts to base64 data URL
- Only processes thumbnails for video content (not images)
- Includes thumbnail in API response as `videoThumbnail` field

### 3. Chat Interface Integration

**File**: `/components/chat-interface.tsx`

- `processFile` function checks for pre-uploaded files with thumbnails
- Preserves `videoThumbnail` property from YouTube/Instagram downloads
- Falls back to client-side thumbnail generation for regular uploads

### 4. Utility Updates

**Files**: 
- `/lib/youtube-url-utils.ts` - Updated `createFileFromYouTubeDownload` to include thumbnails
- `/lib/instagram-url-utils.ts` - Updated `createFileFromInstagramDownload` to include thumbnails
- `/lib/video-utils.ts` - Added thumbnail utility functions

## Display Components

### Chat Message Display

**File**: `/components/chat-message.tsx`

Videos in chat messages display thumbnails when available:
- Shows thumbnail image with play button overlay
- Displays video duration if available
- Falls back to generic video icon if no thumbnail

### Video Gallery

**File**: `/components/video-gallery.tsx`

- Automatically generates thumbnails for videos without them
- Caches thumbnails using `useThumbnailCache` hook
- Shows loading state while generating thumbnails

## Testing

Run the test script to verify thumbnail extraction:

```bash
node test-video-thumbnails.js
```

This will test:
1. YouTube video download with thumbnail extraction
2. Instagram video download with thumbnail extraction
3. Verify thumbnails are included in API responses

## API Response Format

Both YouTube and Instagram download endpoints now return:

```json
{
  "success": true,
  "file": {
    "uri": "gemini-file-uri",
    "mimeType": "video/mp4",
    "displayName": "Video Title",
    "name": "file-name",
    "sizeBytes": 12345678,
    "videoThumbnail": "data:image/jpeg;base64,..."  // New field
  }
}
```

## Future Improvements

1. **Server-side thumbnail generation** for regular uploads
2. **Multiple thumbnail extraction** at different timestamps
3. **Thumbnail optimization** (resize, compress)
4. **Persistent thumbnail storage** in database/blob storage
5. **Fallback to YouTube API** for thumbnail extraction if yt-dlp fails