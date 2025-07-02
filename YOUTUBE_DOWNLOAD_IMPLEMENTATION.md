# YouTube Download Auto-Detection Feature

## Overview
This feature automatically detects YouTube URLs when pasted into the chat and downloads them using yt-dlp, then uploads them as video files to the chat.

## How It Works

### 1. **URL Detection**
When you paste text into the chat input, the system automatically:
- Detects YouTube URLs using regex patterns
- Supports various YouTube URL formats:
  - Standard: `https://www.youtube.com/watch?v=VIDEO_ID`
  - Short: `https://youtu.be/VIDEO_ID`
  - Shorts: `https://www.youtube.com/shorts/VIDEO_ID`
  - Mobile: `https://m.youtube.com/watch?v=VIDEO_ID`

### 2. **Auto-Download**
If auto-download is enabled (default), the system will:
- Immediately start downloading the video
- Show progress indicator
- Use the default quality setting (auto by default)
- Add the downloaded video to your chat files

### 3. **Manual Download**
If auto-download is disabled, the system will:
- Show a preview card with the YouTube URL
- Display quality selector (if enabled)
- Provide download buttons

## Configuration

### Settings Location
Go to **Settings → Video tab → YouTube Download Settings**

### Available Settings

1. **Enable YouTube Download** (Default: ON)
   - Master switch for the entire feature

2. **Auto-detect YouTube URLs** (Default: ON)
   - Automatically detects YouTube URLs when pasted or typed

3. **Auto-download on paste** (Default: ON)
   - Automatically starts downloading when a YouTube URL is pasted
   - If disabled, shows a preview card with manual download options

4. **Default Quality** (Default: Auto)
   - Options: Auto, 1080p, 720p, 480p, Audio Only
   - "Auto" selects the best available quality

5. **Show quality selector** (Default: ON)
   - When manual download is used, shows quality options

## Requirements

### Backend Requirements
- **yt-dlp**: Must be installed on the system
  - Install via pip: `pip install yt-dlp`
  - Or download from: https://github.com/yt-dlp/yt-dlp/releases
- **Gemini API Key**: Required for uploading to Gemini
  - Set in `.env.local`: `GEMINI_API_KEY=your_key`

### Limitations
- Maximum file size: 2GB (Gemini API limit)
- Some videos may be restricted (age-restricted, private, region-locked)
- Download time depends on video length and quality

## Usage Examples

### Quick Download
1. Copy a YouTube URL
2. Paste it into the chat
3. Video automatically downloads and appears in your files

### Manual Quality Selection
1. Disable "Auto-download on paste" in settings
2. Paste a YouTube URL
3. Select desired quality from the dropdown
4. Click "Download Video"

## Troubleshooting

### Common Issues

1. **"yt-dlp not available" error**
   - Install yt-dlp: `pip install yt-dlp`
   - Or run: `npm run postinstall`

2. **"GEMINI_API_KEY not set" error**
   - Add your Gemini API key to `.env.local`
   - Restart the server

3. **Download fails**
   - Check if video is age-restricted or private
   - Try a different quality setting
   - Check your internet connection

4. **Auto-download not working**
   - Check settings: Settings → Video → YouTube Download Settings
   - Ensure "Enable YouTube Download" is ON
   - Ensure "Auto-detect YouTube URLs" is ON
   - Ensure "Auto-download on paste" is ON

## Testing

Run the test script to verify your setup:
```bash
node test-youtube-download.js
```

This will test:
- URL detection functionality
- API endpoint availability
- Settings configuration

## Implementation Details

### Files Modified
1. `/components/ui/animated-ai-input.tsx` - Added auto-download on paste
2. `/lib/contexts/settings-context.tsx` - Added YouTube settings
3. `/components/settings-dialog.tsx` - Added UI for YouTube settings
4. `/lib/youtube-url-utils.ts` - YouTube URL detection utilities
5. `/app/api/youtube-download/route.ts` - Download API endpoint

### Key Features
- Automatic URL detection using regex patterns
- Progress tracking during download
- Gemini file upload integration
- Quality selection support
- Error handling for restricted content
- Settings persistence in localStorage
