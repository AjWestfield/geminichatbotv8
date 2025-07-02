# Image Persistence Fix Instructions

Follow these steps to fix the image persistence issue where uploaded images aren't showing after page refresh.

## Prerequisites
- Access to your Supabase SQL Editor
- The application should be running

## Step 1: Run the Main Fix Script

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `fix-image-persistence.sql`
4. Click "Run" to execute

This script will:
- Check for orphaned images (images without chat_id)
- Create a default "Direct Image Uploads" chat
- Associate all orphaned images with this default chat
- Create triggers to prevent future orphaned images
- Update views and indexes for better performance

## Step 2: Run the Loading Fix Script

1. In the SQL Editor, create a new query
2. Copy and paste the contents of `fix-image-loading.sql`
3. Click "Run" to execute

This script will:
- Create debug functions to diagnose visibility issues
- Fix any remaining orphaned images
- Update RLS policies to be more permissive
- Create optimized views for the API

## Step 3: Verify the Fix

1. In the SQL Editor, create a new query
2. Copy and paste the contents of `verify-image-persistence.sql`
3. Click "Run" to execute

Check the results:
- All checks should show "PASS ✓"
- The summary should show "HEALTHY ✓"
- You should see your uploaded images in the counts

## Step 4: Test in Your Application

1. Go to your application (http://localhost:3000)
2. Navigate to the Images tab
3. Drag and drop some test images
4. Wait for them to upload
5. Refresh the page (F5)
6. **The images should still be visible!**

## Step 5: Check Chat Association

1. Hover over a chat in the sidebar
2. You should see thumbnails of uploaded images
3. The chat might be titled "Direct Image Uploads" or "Image Upload: filename"

## Troubleshooting

If images still don't persist, run `test-api-queries.sql` to:
- Check if the API queries are working
- Verify database performance
- Look for any blocking issues

### Common Issues:

1. **No images showing after refresh**
   - Check browser console for errors
   - Verify Supabase connection is working
   - Run the verification script again

2. **Images show but not in chat tooltips**
   - The chat_summaries view might need to be refreshed
   - Try creating a new chat and uploading images there

3. **"Failed to upload" errors**
   - Check your Gemini API key is valid
   - Verify blob storage is configured
   - Check browser network tab for detailed errors

## What These Scripts Do

### Database Changes:
1. Creates a default chat for orphaned images
2. Adds a trigger to auto-assign chat IDs to new images
3. Updates the chat_summaries view to include all images
4. Adds indexes for better query performance
5. Creates debug functions to diagnose issues

### Application Behavior:
- When you drop images without an active chat, a new chat is created
- All images are guaranteed to have a chat association
- Images are saved to both blob storage and database
- The sidebar updates to show the new/updated chat

## Next Steps

After running these scripts:
1. Monitor the application for any issues
2. Check that new uploads work correctly
3. Verify that chat switching preserves images
4. Test that image editing still works

The fix ensures that all images - whether uploaded through chat or directly to the gallery - are properly persisted and associated with a chat session.