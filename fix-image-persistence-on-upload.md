# Fix Image Persistence on Upload

## Problem
When images are uploaded directly to the image tab, they display correctly but disappear after a browser refresh. This happens because:

1. Images are saved to localStorage but may not be saved to the database
2. On page refresh, if persistence is enabled, the database is treated as source of truth
3. Images not in the database are filtered out from localStorage

## Root Cause
In `handleCanvasFileUpload`, even though a new chat is created when there's no active chat, there's a potential timing issue where the `currentChatId` state hasn't been updated when images are being saved to the database.

## Solution
We need to ensure that the newly created `chatId` is used consistently throughout the upload process, and that we wait for the chat creation to complete before proceeding with image saves.

## Implementation Plan

1. **Update `handleCanvasFileUpload` to ensure proper chat ID usage**
   - Use the local `chatId` variable (not `currentChatId`) for all database operations
   - Ensure state updates are completed before proceeding

2. **Add a fallback for localStorage persistence**
   - Even when persistence is enabled, keep uploaded images that don't have a corresponding database entry
   - This ensures images aren't lost if database save fails

3. **Improve error handling**
   - Add better logging to track when images fail to save to database
   - Show user notifications if persistence fails

## Files to Modify
- `/app/page.tsx` - Fix the handleCanvasFileUpload and loadPersistedImages functions
