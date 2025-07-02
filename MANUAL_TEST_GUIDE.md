# Manual Test Guide for Real-Time Progress Updates

## Prerequisites
1. Start the development server: `npm run dev`
2. Open http://localhost:3000 in your browser
3. Open DevTools Network tab to monitor SSE streams

## Test Setup
1. Click Settings (gear icon)
2. Enable "Auto-download" for all three platforms
3. Close settings

## Test URLs
- **Instagram**: `https://www.instagram.com/p/C5qLPhxsQMJ/`
- **YouTube**: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- **TikTok**: `https://www.tiktok.com/@username/video/7123456789012345678`

## Test Steps for Each Platform

### 1. Test Paste Behavior
- Copy one of the test URLs
- Click in the chat input
- Paste the URL (Cmd+V or Ctrl+V)

**Expected:**
- ✅ NO "Video Detected" UI appears
- ✅ Download starts immediately
- ✅ Progress bar appears with real-time updates

### 2. Monitor Progress Updates
Watch the progress bar and message:

**Expected progression:**
- "Starting download..." (0%)
- "Analyzing video..." (10-30%)
- "Downloading: X%" (30-60%)
- "Processing video..." (60-80%)
- "Uploading to Gemini..." (80-95%)
- "Download completed!" (100%)

**Success criteria:**
- ✅ Progress updates smoothly (not jumping 0→100)
- ✅ Multiple intermediate values shown
- ✅ Progress messages change during download

### 3. Check File List
After download completes:

**Expected:**
- ✅ Video appears in file list (right sidebar)
- ✅ Thumbnail is visible (if available)
- ✅ File name matches the platform

### 4. Check Chat Interface
**Expected:**
- ✅ Chat input is cleared (empty)
- ✅ Video preview appears in chat
- ✅ "Analyze video" and "Reverse engineer" buttons visible

### 5. Monitor Network Tab (Advanced)
In DevTools Network tab:

1. Look for requests ending in `-download-sse`
2. Click on the request
3. Go to "EventStream" or "Response" tab
4. You should see multiple `data:` events with progress updates

## Platform-Specific Notes

### YouTube
- Uses actual yt-dlp progress parsing
- May show more accurate download percentages
- Progress based on actual file download

### Instagram
- Simulates smooth progress
- May require cookies if private content
- Shows thumbnail in file list

### TikTok
- Simulates smooth progress
- Handles various URL formats
- Shows thumbnail if available

## Troubleshooting

### Progress jumps from 0 to 100
- Check Network tab for SSE stream
- Ensure `-sse` endpoints are being called
- Check for any console errors

### "Video Detected" UI appears
- Verify auto-download is enabled in settings
- Check that detected URLs are cleared in handleTextChange
- Ensure URL detection is working properly

### Chat input not clearing
- Check handleTextChange for setDetectedUrls([])
- Verify auto-download triggers properly
- Check for any state update issues

### No video options in chat
- Ensure file upload completed successfully
- Check for Gemini API errors
- Verify video was added to uploads array

## Success Checklist
For each platform, verify:

- [ ] No "Video Detected" UI when auto-download enabled
- [ ] Progress updates smoothly with multiple values
- [ ] Progress messages change during download
- [ ] Video appears in file list after completion
- [ ] Chat input is cleared after paste
- [ ] Video analysis options appear in chat
- [ ] SSE stream shows in Network tab

## Comparison with Old Behavior
**Before (YouTube/TikTok):**
- "Video Detected" UI appeared
- Progress jumped 0% → 100%
- Had to click download button

**After (All platforms like Instagram):**
- Direct auto-download on paste
- Smooth progress updates
- No manual interaction needed