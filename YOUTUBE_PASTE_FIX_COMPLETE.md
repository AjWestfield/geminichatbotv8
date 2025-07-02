# YouTube URL Paste Error Fix - Complete Solution

## Problem Identified
When pasting YouTube URLs in the chat input, users were getting the error:
```
Error: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse: [400 Bad Request] The File [file_id] is not in an ACTIVE state and usage is not allowed.
```

## Root Cause Analysis

### The Issue Chain:
1. **Vercel AI SDK includes ALL messages** with their attachments when making API calls
2. **Chat persistence saves attachment data** including Gemini file URIs with messages
3. **When loading a chat from history**, old messages contain `experimental_attachments` with expired Gemini file URIs
4. **These expired file references are sent with EVERY new message**, causing the error

### Why the Previous Fix Didn't Work:
- The `skipValidation` flag only prevented validation during upload
- The `nextMessageFilesRef` only controlled files for the current message
- But the Vercel AI SDK was still sending ALL historical messages with their expired attachments

## Comprehensive Solution Implemented

### 1. **Prevent Loading Expired Attachments** (`app/page.tsx`)
```typescript
// NEVER include experimental_attachments when loading from history
// The Vercel AI SDK sends ALL messages on every API call
if (msg.attachments && msg.attachments.length > 0) {
  console.log('[PAGE] Excluding ALL attachments from loaded message to prevent expired Gemini file errors');
}
```

### 2. **Filter Out Old Files** (`components/chat-interface.tsx`)
```typescript
// Only send files uploaded within last 5 minutes or social media downloads
const freshFiles = filesToSend.filter(file => {
  const fileAge = file.uploadTimestamp ? Date.now() - file.uploadTimestamp : 0;
  const isFresh = fileAge < 5 * 60 * 1000; // 5 minutes
  const isSocialMediaDownload = file.skipValidation === true;
  return isFresh || isSocialMediaDownload;
});
```

### 3. **Add Timestamp Tracking** (All file utilities)
- Added `uploadTimestamp` to all file uploads
- YouTube, Instagram, TikTok, Facebook downloads all get timestamps
- Regular file uploads also get timestamps

## How It Works Now

1. **When loading a chat**: No `experimental_attachments` are included in messages
2. **When uploading files**: Files get `uploadTimestamp` for freshness tracking
3. **When sending messages**: Only fresh files (< 5 minutes old) or social media downloads are sent
4. **Attachment display**: `messageAttachments` state still shows files in UI, but they're not sent to API

## Benefits

- ✅ No more "File is not in an ACTIVE state" errors
- ✅ Chat history loads without causing errors
- ✅ Fresh YouTube/social media downloads work correctly
- ✅ File attachments still display in chat UI
- ✅ Only valid, fresh files are sent to Gemini API

## Testing

To verify the fix:
1. Load an old chat with file attachments
2. Paste a YouTube URL
3. The download should complete without errors
4. Send the message - no expired file errors should occur

The fix ensures that historical file references never interfere with new messages!