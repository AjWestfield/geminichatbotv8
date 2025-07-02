# Gemini File Expiration Fix

## Problem
Users were encountering the error:
```
[GoogleGenerativeAI Error]: The File actxttd5rv91 is not in an ACTIVE state and usage is not allowed.
```

This occurred when trying to use files (screenshots, images, videos) that were uploaded to Gemini more than 48 hours ago. Gemini files have a TTL (time to live) and expire after this period.

## Solution Implemented

### 1. File State Validation (`lib/gemini-file-validator.ts`)
- Created a new validator class that checks file state before use
- Validates if files are in ACTIVE, PROCESSING, or expired states
- Provides clear error messages when files are expired

### 2. Chat API Updates (`app/api/chat/route.ts`)
- Added file validation before sending to Gemini
- Checks all uploaded files for valid state
- Returns user-friendly error messages for expired files
- Prevents the API error from reaching the user

### 3. User Interface Updates (`components/ui/animated-ai-input.tsx`)
- Added visual indicator (⏱️ 48hr) on uploaded files
- Added tooltip explaining file expiration
- Helps users understand the temporary nature of uploads

### 4. Documentation (`CLAUDE.md`)
- Added section explaining file upload limitations
- Documents the 48-hour expiration period
- Suggests local caching for frequently used files

## How It Works

1. When a user sends a message with attached files:
   - The system validates each file's state with Gemini
   - Expired files are identified and logged
   - Valid files proceed normally

2. If any files are expired:
   - A clear error message is sent to the user
   - The message explains which files expired
   - User is prompted to re-upload the files

3. Visual indicators in the UI:
   - Show users that files expire after 48 hours
   - Help prevent confusion about file availability

## User Experience

Before: Cryptic error about file not being in ACTIVE state
After: Clear message: "The following files have expired and need to be re-uploaded: [filename]. Files uploaded to the AI expire after 48 hours."

## Future Improvements

1. Implement local file caching to automatically re-upload expired files
2. Add a file expiration countdown timer in the UI
3. Store file metadata in the database to track expiration times
4. Implement automatic file cleanup for expired references