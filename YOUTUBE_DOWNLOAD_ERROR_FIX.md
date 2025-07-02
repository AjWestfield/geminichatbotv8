# YouTube Download Error Fix (HTTP 416)

## Error
```
Error: yt-dlp exited with code 1
Error details: ERROR: unable to download video data: HTTP Error 416: Requested range not satisfiable
```

## Common Causes & Solutions

### 1. Update yt-dlp
YouTube frequently changes their API, so yt-dlp needs regular updates:

```bash
# Update yt-dlp
brew upgrade yt-dlp
# or
pip install --upgrade yt-dlp
```

### 2. Check Video Availability
The video might be:
- Age-restricted (requires login)
- Private or deleted
- Region-locked
- Copyright blocked

Try a different video URL to test:
- Public video: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`

### 3. Clear yt-dlp Cache
Sometimes cached data causes issues:

```bash
# Clear yt-dlp cache
yt-dlp --rm-cache-dir
```

### 4. Test yt-dlp Directly
Test if yt-dlp works outside the app:

```bash
# Test download
yt-dlp -F "https://www.youtube.com/watch?v=VIDEO_ID"
```

### 5. Use Cookies (for restricted videos)
If the video requires authentication:
1. Export cookies from your browser
2. Use the cookie manager in the app
3. Or manually test: `yt-dlp --cookies cookies.txt "URL"`

## The Expired File Fix Still Works! ✅

This download error is separate from the expired file fix. The expired file fix prevents old Gemini file references from being sent and is working correctly. This is just yt-dlp having trouble downloading the specific video.

## Next Steps
1. Try a different YouTube URL
2. Update yt-dlp if needed
3. Check if the video is publicly accessible
4. Use cookies if the video requires login