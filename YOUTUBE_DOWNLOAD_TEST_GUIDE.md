# YouTube Auto-Download Feature Test Guide

## Overview
This guide will help you verify that the YouTube auto-download feature is working correctly in your Gemini Chatbot v7.

## Test Setup
1. Make sure the app is running:
   ```bash
   ./start.sh
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Test Procedure

### Test 1: Basic YouTube URL Detection
1. Copy this YouTube URL:
   ```
   https://www.youtube.com/watch?v=dQw4w9WgXcQ
   ```

2. Paste it into the chat input field

3. **Expected Result:**
   - The URL should be automatically detected
   - A download progress indicator should appear
   - The video should start downloading automatically
   - Once complete, the video should appear as a file upload in the chat

### Test 2: Different YouTube URL Formats
Test the following URLs to ensure all formats are detected:

1. **Short URL:**
   ```
   https://youtu.be/dQw4w9WgXcQ
   ```

2. **YouTube Shorts:**
   ```
   https://youtube.com/shorts/abcdef12345
   ```

3. **Mobile URL:**
   ```
   https://m.youtube.com/watch?v=test123
   ```

### Test 3: Settings Verification
1. Click the Settings button in the app
2. Navigate to the Video tab
3. Look for "YouTube Download Settings"
4. Verify these settings:
   - **Enable YouTube Download:** Should be ON
   - **Auto-detect YouTube URLs:** Should be ON
   - **Auto-download on paste:** Should be ON
   - **Default Quality:** Should be set to "auto"

### Test 4: Manual API Test
Open a new terminal and run:
```bash
curl -X POST http://localhost:3000/api/youtube-download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

**Expected Response:**
```json
{
  "success": true,
  "title": "Video Title",
  "duration": "3:52",
  "quality": "720p",
  "fileUri": "https://generativelanguage.googleapis.com/..."
}
```

## Troubleshooting

### If YouTube URLs are not detected:
1. Check browser console for errors (F12 → Console)
2. Verify settings are enabled (see Test 3)
3. Try refreshing the page
4. Clear browser cache

### If download fails:
1. Check if you have internet connection
2. Verify the YouTube URL is valid
3. Check browser console for error messages
4. Try with a different YouTube video

### If video doesn't appear after download:
1. Check if the download completed (progress should reach 100%)
2. Look for any error messages
3. Verify the file upload area is visible

## Implementation Details

The YouTube auto-download feature consists of:
- **URL Detection:** `lib/youtube-url-utils.ts`
- **Download API:** `app/api/youtube-download/route.ts`
- **UI Integration:** `components/ui/animated-ai-input.tsx`
- **Settings:** `lib/contexts/settings-context.tsx`

## Success Criteria
✅ YouTube URLs are automatically detected when pasted
✅ Download starts automatically without user action
✅ Progress indicator shows download percentage
✅ Video appears as file upload when complete
✅ Video can be sent with messages for AI analysis

## Notes
- The feature uses yt-dlp for downloading videos
- Videos are uploaded to Gemini File API for AI processing
- Default quality is set to "auto" but can be changed in settings
- Large videos may take longer to download and process