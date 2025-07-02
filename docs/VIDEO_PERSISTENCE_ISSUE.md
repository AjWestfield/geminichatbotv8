# Video Persistence Issue - Root Cause Analysis and Solutions

## Issue Summary
Videos are not persisting properly. When loading the app, videos show "Format error" and fail to play.

## Root Cause
Replicate URLs are **temporary** and expire after 24 hours. The app is storing these temporary URLs in the database, which become invalid when loaded later.

Example of expired URL:
```
https://replicate.delivery/xezq/z0pVfO7c5D1UK6QxHW4MKsfRMWCZSf62hHmbpLDiLVFe6rjTB/tmpy8df4lg4.mp4
```

## Immediate Fix (Implemented)
1. **Added URL expiration detection** in `video-validation.ts`
   - `isReplicateUrlExpired()` checks if URL is older than 24 hours
   - `filterValidVideos()` removes expired videos when loading

2. **Updated video loading** in `page.tsx`
   - Now filters out expired videos on load
   - Prevents errors from trying to play expired URLs

3. **Enhanced video gallery** display
   - Shows "Video Expired" message for expired videos
   - Allows users to delete expired videos
   - Prevents playback attempts of expired URLs

## Long-term Solutions

### Option 1: Permanent Storage (Recommended)
Store videos in permanent storage like Vercel Blob or Supabase Storage.

**Implementation:**
1. When video generation completes, upload to permanent storage
2. Store the permanent URL in database
3. Delete temporary Replicate URL

**Pros:**
- Videos persist forever
- No expiration issues
- Better user experience

**Cons:**
- Storage costs
- Additional upload time

### Option 2: On-Demand URL Refresh
Keep track of Replicate prediction IDs and refresh URLs when needed.

**Implementation:**
1. Store prediction ID with video
2. When loading expired video, call Replicate API to get fresh URL
3. Update database with new URL

**Pros:**
- No storage costs
- Uses Replicate's infrastructure

**Cons:**
- Requires Replicate API calls
- May fail if prediction is too old
- Slower load times

### Option 3: Download and Local Storage
Download videos to user's device when generated.

**Implementation:**
1. Auto-download video when generation completes
2. Store reference to local file
3. Use File API to play local videos

**Pros:**
- No server storage costs
- Fast playback
- User owns their content

**Cons:**
- Uses user's disk space
- Complex implementation
- Browser limitations

## Recommendation
Implement **Option 1** (Permanent Storage) using Vercel Blob:

1. Already have `BLOB_READ_WRITE_TOKEN` configured
2. Similar pattern to image storage
3. Most reliable solution
4. Best user experience

## Implementation Steps for Permanent Storage

1. **Update video generation completion handler:**
   ```typescript
   // When video completes
   const blobUrl = await uploadVideoToBlob(replicateUrl)
   video.url = blobUrl
   video.permanentUrl = blobUrl
   ```

2. **Create upload function:**
   ```typescript
   async function uploadVideoToBlob(tempUrl: string) {
     const response = await fetch(tempUrl)
     const blob = await response.blob()
     return await uploadToVercelBlob(blob, 'video')
   }
   ```

3. **Update database schema:**
   - Add `permanent_url` column
   - Migrate existing videos

4. **Clean up old videos:**
   - Implement retention policy
   - Delete old videos to manage costs

## Temporary Workaround
Users can:
1. Download videos immediately after generation
2. Re-generate expired videos
3. Use screen recording for important videos

## Cost Considerations
- Vercel Blob: ~$0.15/GB stored, ~$0.36/GB bandwidth
- Average video (~10MB): ~$0.0015 storage/month
- 100 videos: ~$0.15/month storage

## Timeline
- Immediate fix: ✅ Completed (filters expired URLs)
- Permanent storage: 2-3 days to implement
- Full migration: 1 week including testing

## Status: June 21, 2025
- Immediate fix deployed
- Users can see expired videos and delete them
- No more "Format error" crashes
- Ready for permanent storage implementation
