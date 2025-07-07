# Gemini Video Playback Explanation

## The Issue

When you upload a video file to the chat:
1. The file is read locally and converted to a blob URL for preview
2. The file is then uploaded to Gemini's API for AI processing
3. Gemini returns a file URI like `https://generativelanguage.googleapis.com/v1beta/files/[ID]`
4. This Gemini URI is **NOT** a direct video URL - it's an API endpoint that returns metadata

## Why Video Proxy Doesn't Work

The video proxy approach attempted to fetch the video content from Gemini's API, but:
- Gemini file URIs return JSON metadata, not the actual video content
- The API response shows `contentType: 'application/json'` instead of `video/mp4`
- Gemini files are meant to be passed to the AI model, not played directly

## The Solution

The FilePreviewModal has been updated to:

1. **Detect Gemini-only videos**: If only a Gemini URI is available (no local blob URL), it shows a message explaining the video can't be played directly

2. **Use local blob URLs**: When available, videos play using the local blob URL created during upload

3. **Clear messaging**: Users see:
   ```
   "This video is stored on Gemini AI and cannot be played directly. 
    Use the Analyze or Reverse Engineer buttons below to work with this video."
   ```

## How Videos Work in the App

1. **Local Preview**: When you first select a video, it's converted to a blob URL that can be played
2. **Gemini Upload**: The video is uploaded to Gemini for AI processing
3. **Playback Options**:
   - If blob URL exists → Video plays normally
   - If only Gemini URI exists → Shows explanation message with action buttons

## Video Processing Flow

```
User selects video → Create blob URL → Upload to Gemini → Store both URLs
                        ↓                                      ↓
                   Can play video                    Use for AI analysis
```

## Technical Details

- Blob URLs look like: `blob:http://localhost:3000/abc123...` or `data:video/mp4;base64,...`
- Gemini URIs look like: `https://generativelanguage.googleapis.com/v1beta/files/xyz789`
- Only blob URLs can be played in HTML5 video elements
- Gemini URIs are for API use only

## Best Practices

1. Always preserve the local blob URL when possible
2. Use Gemini URIs only for AI operations (analyze, reverse engineer)
3. Provide clear feedback when video playback isn't possible
4. Offer alternative actions (download, analyze) when playback fails