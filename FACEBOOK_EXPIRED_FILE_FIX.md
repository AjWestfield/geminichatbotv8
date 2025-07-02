# Facebook Video Expired File Fix

## Problem
When pasting a Facebook video URL that was previously downloaded, the system shows an error:
```
⚠️ File Upload Error:
The following files have expired and need to be re-uploaded: 100inmatesvs1snowbunny-1449934919338846.mp4. 
Files uploaded to the AI expire after 48 hours.
```

## Root Cause
1. Facebook videos are downloaded and uploaded to Gemini API
2. Gemini files expire after 48 hours
3. The file reference (geminiFile.uri) is being cached/persisted somewhere
4. When pasting the same URL again, it tries to reuse the expired file instead of downloading fresh

## Solutions

### 1. Clear Files Before Download (Already Applied)
- Clear detected Facebook URLs before starting download
- Ensures UI is clean for new downloads

### 2. Add Timestamp to Filenames (Already Applied)
- Prevents filename collisions
- Forces unique files for each download

### 3. Additional Fixes Needed

#### Option A: Clear Old Files on URL Detection
Add logic to remove any existing files with the same Facebook video ID before downloading:

```typescript
// In handleTextChange or handlePaste
const facebookUrlInfo = detectFacebookUrl(url);
if (facebookUrlInfo && selectedFiles) {
  // Remove any existing files from this Facebook video
  const filteredFiles = selectedFiles.filter(file => 
    !file.name.includes(facebookUrlInfo.videoId)
  );
  onFilesSelect?.(filteredFiles);
}
```

#### Option B: Skip File Validation for Fresh Downloads
Mark freshly downloaded files to skip validation:

```typescript
// In createFileFromFacebookDownload
Object.defineProperty(mockFile, 'skipValidation', {
  value: true,
  writable: false
});

// In chat API, check this flag
if (!file.skipValidation) {
  // Validate file
}
```

#### Option C: Clear Chat Persistence
The most likely culprit is chat persistence storing old file references. Check:
- localStorage for cached files
- Chat history with attached files
- Any file restoration logic on chat load

## Immediate Workaround
1. Clear browser cache/localStorage
2. Start a new chat
3. Don't reload the page after downloading Facebook videos

## Long-term Fix
Implement proper file expiration handling:
1. Track file upload timestamps
2. Automatically re-download when files are older than 47 hours
3. Clear expired file references from persistence
4. Show warning when files are about to expire