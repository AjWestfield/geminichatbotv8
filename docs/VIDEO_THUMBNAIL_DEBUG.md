# Video Thumbnail Debug Guide

## Issue
Video thumbnails are not displaying in the video gallery. The videos show a dark/empty preview instead of the first frame.

## Debug Steps Applied

1. **Enhanced Thumbnail Generation Logic**
   - Added ref callback to video element for better control
   - Using both `loadeddata` and `canplay` events for reliability
   - Seeking to 0.1 seconds instead of 0 to ensure we get a valid frame
   - Added immediate check if video is already loaded

2. **Improved Display Logic**
   - Thumbnail now always shows as background
   - Video element opacity changes on hover (0 when not hovering, 100% when hovering)
   - Removed poster attribute to prevent conflicts
   - Shows placeholder icon while thumbnail is generating

3. **Added Debug Logging**
   - Logs when thumbnail generation starts
   - Logs video readyState to check if video is ready
   - Logs canvas dimensions
   - Logs thumbnail data URL length
   - Logs when thumbnail is stored

## Common Issues and Solutions

### CORS Issues
If you see CORS errors in the console:
- The video might be from a different domain without proper CORS headers
- Solution: The video source needs to include `Access-Control-Allow-Origin` headers

### Video Format Issues
- Ensure the video is in a browser-supported format (MP4, WebM, etc.)
- Check browser console for media errors

### Timing Issues
- Some videos might take longer to load
- The current implementation tries multiple approaches:
  - `loadeddata` event
  - `canplay` event
  - Immediate check if already loaded

## Testing the Fix

1. **Open Browser Console**
   - Look for `[VideoGallery]` logs
   - Check for any error messages

2. **Check Video Loading**
   - Verify videos are playing when you hover
   - Check if thumbnail generates after video loads

3. **Manual Test**
   ```javascript
   // In browser console, you can test thumbnail generation:
   const video = document.querySelector('video');
   const canvas = document.createElement('canvas');
   canvas.width = video.videoWidth;
   canvas.height = video.videoHeight;
   const ctx = canvas.getContext('2d');
   ctx.drawImage(video, 0, 0);
   console.log(canvas.toDataURL('image/jpeg', 0.8));
   ```

## Next Steps if Still Not Working

1. **Check Video Source**
   - Ensure the video URL is accessible
   - Try downloading the video to check if it's valid

2. **Try Alternative Approach**
   - Generate thumbnails server-side when video is uploaded
   - Use a video processing service

3. **Fallback Options**
   - Show a default video thumbnail
   - Allow users to upload custom thumbnails
