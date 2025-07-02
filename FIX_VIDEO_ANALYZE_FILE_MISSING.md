# Fix: Video File Not Being Sent with Analyze/Reverse Engineer Request

## Problem
When selecting "Analyze" or "Reverse Engineer" for a video in the chat interface, the video file was not being sent with the request, causing Gemini to respond asking for the video content.

## Root Cause
1. **Proxy URL Issue**: Message attachments were storing a proxy URL (`/api/video-proxy?uri=...`) instead of the raw Gemini URI
2. **Missing File Selection**: The `handleFilePreviewOptionSelect` function wasn't setting the file as selected before submitting
3. **Lost Gemini URI**: The original Gemini URI was not preserved when creating message attachments

## Solution

### 1. Modified `handleFilePreviewOptionSelect` Function
- Added code to create a mock file object and set it as selectedFile before submitting
- Added logic to extract the actual Gemini URI from proxy URLs
- Added support for using `geminiFileUri` if available in the attachment data

### 2. Preserved Gemini URI in Attachments
- Added `geminiFileUri` field to `pendingAttachmentRef` to preserve the original Gemini URI
- Updated attachment creation to include `geminiFileUri` in the attachment objects
- Modified `attachmentsToSet` to include the `geminiFileUri` field

### 3. Smart URI Resolution
The fix now checks for Gemini URIs in the following order:
1. First checks if `geminiFileUri` is directly available in the attachment
2. Falls back to extracting from proxy URL if needed
3. Uses the URL as-is if neither applies

## Files Modified
- `/components/chat-interface.tsx` - Updated file handling logic

## Testing
To test the fix:
1. Upload or download a video (YouTube, Instagram, etc.)
2. Click on the video in the chat to open the preview
3. Select "Analyze" or "Reverse Engineer"
4. The video should now be properly analyzed without Gemini asking for the file

## Technical Details
The fix ensures that when analyzing/reverse engineering videos from chat attachments:
- The original Gemini URI is preserved throughout the attachment lifecycle
- The file is properly set as selectedFile before submission
- The correct Gemini URI is extracted and used in the file object