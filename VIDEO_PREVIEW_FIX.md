# Video Preview Fix Summary

## Problem
Local video uploads were showing "stored on Gemini AI" message instead of playing in the FilePreviewModal because the blob URL created during upload wasn't being properly passed to the modal.

## Root Cause
In the `processFile` function in `chat-interface.tsx`, the preview URL was only being set for images, not for videos. While the `handleFileSelect` function was generating a data URL for videos, this wasn't being used in `processFile`.

## Solution
Added code to create a blob URL for local video files in the `processFile` function:

```typescript
// Generate preview URL for local video files if not pre-uploaded
if (!fileUpload.geminiFile && !(file as any).isPreUploaded) {
  try {
    // Create blob URL for video preview
    const videoBlob = new Blob([file], { type: file.type })
    const videoBlobUrl = URL.createObjectURL(videoBlob)
    fileUpload.preview = videoBlobUrl
    console.log(`[processFile] Created blob URL for video preview: ${videoBlobUrl}`)
  } catch (blobError) {
    console.error('Failed to create blob URL for video:', blobError)
  }
}
```

Also updated `handleFileClick` to explicitly pass the preview URL as `videoUrl` in the FilePreviewModal data.

## Result
- Local video uploads now have a blob URL stored in `fileUpload.preview`
- The FilePreviewModal receives this URL and can play the video
- The fix only applies to local uploads (not pre-uploaded files from social media)
- Console logs added for debugging

## Testing
To test the fix:
1. Upload a local video file using the file upload button
2. Click on the uploaded video in the chat
3. The FilePreviewModal should now play the video instead of showing "stored on Gemini AI"