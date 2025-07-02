# Instagram Download Fix - Zero Byte File Issue

## Problem
Instagram downloads were failing with the error:
- "Size: 0 bytes"
- "File processing failed: Failed to upload to Gemini: File size must be positive: 0"

## Root Cause
The `createFileFromInstagramDownload` function in `lib/instagram-url-utils.ts` was creating a File object with an empty array `new File([], fileName, ...)`, resulting in a 0-byte file. When this file was passed to the upload system, it was rejected due to having no content.

## Solution
Modified both Instagram and YouTube download utilities to:

1. **Create a dummy blob with minimal content** instead of an empty array:
   ```javascript
   const dummyContent = new Blob(['placeholder'], { type: downloadResult.file.mimeType || 'video/mp4' })
   const mockFile = new File([dummyContent], fileName, { type: downloadResult.file.mimeType || 'video/mp4' })
   ```

2. **Add an `isPreUploaded` flag** to indicate the file is already uploaded to Gemini:
   ```javascript
   Object.defineProperty(mockFile, 'isPreUploaded', {
     value: true,
     writable: false
   })
   ```

3. **Enhanced the `processFile` function** in `chat-interface.tsx` to properly handle pre-uploaded files and skip unnecessary processing.

## Files Modified
- `/lib/instagram-url-utils.ts` - Fixed `createFileFromInstagramDownload` function
- `/lib/youtube-url-utils.ts` - Fixed `createFileFromYouTubeDownload` function  
- `/components/chat-interface.tsx` - Enhanced `processFile` to better handle pre-uploaded files

## Testing
To test the fix:
1. Paste an Instagram URL in the chat input
2. The download detection should appear
3. Click "Download Media"
4. The file should be successfully added to your files
5. You should be able to send it in the chat without errors

The same fix applies to YouTube downloads as well.