# Instagram Reel Download Test Guide

## Feature Overview
The Instagram reel auto-download feature allows users to paste Instagram reel URLs into the chat interface, which will then be automatically detected and downloaded as video files to be used in conversations.

## How It Works
1. When a user pastes an Instagram reel URL (e.g., `https://www.instagram.com/reel/ABC123/`), the app detects it
2. A download prompt appears with Instagram's signature purple-pink gradient
3. Users can click "Download Reel" to download the video
4. The downloaded video is uploaded to Gemini API and added to the chat's file list
5. The video can then be used in AI conversations

## Testing Instructions

### Basic Functionality Test
1. Start the development server: `npm run dev`
2. Open the chat interface
3. Find a public Instagram reel URL (format: `https://www.instagram.com/reel/[ID]/`)
4. Paste the URL into the chat input
5. Verify that the Instagram reel detection UI appears
6. Click "Download Reel" button
7. Watch the progress indicator
8. Verify the video is added to your files

### URL Format Support
Test these Instagram URL formats:
- Reels: `https://www.instagram.com/reel/[ID]/`
- Reels (alternate): `https://www.instagram.com/reels/[ID]/`  
- Posts (may contain video): `https://www.instagram.com/p/[ID]/`
- IGTV: `https://www.instagram.com/tv/[ID]/`

### Auto-Download Test
1. Go to Settings (gear icon)
2. Find YouTube Download Settings (currently shared with Instagram)
3. Enable "Auto-download on paste"
4. Paste an Instagram URL
5. Verify it downloads automatically without showing the prompt

### Error Handling Test
Test these scenarios:
1. **Private Content**: Try a private reel URL
   - Expected: Error message about private content
2. **Invalid URL**: Try `https://www.instagram.com/invalid/`
   - Expected: No detection UI appears
3. **Network Issues**: Disconnect internet and try downloading
   - Expected: Network error message

### Multiple URLs Test
1. Paste multiple Instagram URLs at once:
   ```
   Check out these reels:
   https://www.instagram.com/reel/ABC123/
   https://www.instagram.com/reel/DEF456/
   ```
2. Verify both URLs are detected
3. Download them individually

## Current Limitations
1. **Public Content Only**: The feature works best with public Instagram content
2. **No Authentication**: Private reels require authentication (not yet implemented)
3. **Rate Limiting**: Instagram may rate-limit requests after multiple downloads
4. **File Size**: Large videos may fail due to Gemini API limits

## Recent Fix (December 2024)
Fixed an issue where Instagram downloads would fail with "File processing failed" and "Size: 0 bytes" errors. The system now properly handles pre-uploaded files from Instagram/YouTube without attempting to re-upload them.

## Settings (Shared with YouTube)
The Instagram download feature currently uses YouTube download settings:
- **Enable Downloads**: Toggle social media downloads on/off
- **Auto-detect URLs**: Automatically detect pasted URLs
- **Auto-download**: Download immediately on paste
- **Show quality selector**: Not applicable for Instagram (hidden)

## Troubleshooting

### "Failed to download Instagram media"
- Check if the reel is public
- Try again after a few minutes (rate limiting)
- Verify your internet connection

### "File too large"
- Instagram videos exceeding Gemini's file size limit cannot be uploaded
- Try downloading shorter reels

### No detection UI appears
- Ensure YouTube downloads are enabled in settings
- Check that the URL format is correct
- Try refreshing the page

## Technical Details
- Uses Instagram's GraphQL API for public content
- Falls back to yt-dlp if GraphQL fails
- Downloads are processed server-side
- Videos are uploaded to Gemini API for AI processing

## Future Enhancements
1. Instagram-specific settings separate from YouTube
2. Cookie/authentication support for private content
3. Carousel post support (multiple images/videos)
4. Story download support
5. Thumbnail preview before download