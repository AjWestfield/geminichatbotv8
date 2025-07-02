# Test Guide: YouTube URL Clearing & Instagram Thumbnails

## 1. YouTube URL Clearing Test

### Test Cases:

#### A. Paste with Auto-Download Enabled
1. Enable YouTube auto-download in settings
2. Copy a YouTube URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
3. Paste it into the chat input
4. **Expected**: URL appears in input briefly, then gets cleared after download starts

#### B. Paste Different YouTube URL Formats
Test with these URL formats:
- Short URL: `https://youtu.be/dQw4w9WgXcQ`
- Full URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- Mobile URL: `https://m.youtube.com/watch?v=dQw4w9WgXcQ`
- With timestamp: `https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s`

#### C. Type URL Manually
1. Type a YouTube URL manually
2. Wait for it to be detected
3. Click download
4. **Expected**: URL gets cleared from input after download

#### D. Multiple URLs
1. Paste text containing multiple YouTube URLs
2. **Expected**: All URLs get cleared after download

## 2. Instagram Video Thumbnail Test

### Test Cases:

#### A. Instagram Video/Reel Download
1. Copy an Instagram reel URL: `https://www.instagram.com/reel/ABC123/`
2. Paste or type it into chat
3. Download the video
4. **Expected**: After download, the video attachment should show a thumbnail preview

#### B. Check Thumbnail Display
After downloading an Instagram video:
1. Look at the file attachment area
2. **Expected**: Video should display with:
   - Thumbnail image preview
   - Video icon overlay
   - File name and size

#### C. Compare with YouTube
1. Download both a YouTube and Instagram video
2. **Expected**: Both should show thumbnail previews in the attachment area

## 3. Verification Steps

### For Developers:
1. Open browser console
2. Look for logs starting with `[Instagram Download]` 
3. Verify `hasThumbnail: true` in the logs
4. Check for `thumbnailLength` > 0

### Visual Checks:
- ✅ YouTube URLs disappear from input after download
- ✅ Instagram videos show thumbnails in attachments
- ✅ Thumbnails load without errors
- ✅ Video icon overlay appears on thumbnails

## Common Issues:

1. **URL not clearing**: Check if auto-download is enabled
2. **No thumbnail**: Verify Instagram download returns thumbnail data
3. **Thumbnail not displaying**: Check console for loading errors