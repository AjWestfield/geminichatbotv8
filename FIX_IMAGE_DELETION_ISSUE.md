# Image Deletion Issue Fix Guide

## Problem Summary
Users cannot delete images from the Canvas view, receiving the error: "Image not found or could not be deleted"

## Diagnosis Steps

### 1. Check Browser Console
Open the browser console (F12) and look for:
- `[ImageGallery] Attempting to delete image:` - Shows the ID being sent
- `[API] DELETE /api/images/[id]` - Shows what the API received
- Any error messages or stack traces

### 2. Run Database Diagnostics
Copy and run this SQL in your Supabase SQL Editor:

```sql
-- Check a specific image by ID (replace with your actual image ID)
SELECT 
    id,
    chat_id,
    url,
    metadata,
    metadata->>'localId' as local_id,
    created_at
FROM images
WHERE id::text = 'YOUR_IMAGE_ID_HERE'
   OR metadata->>'localId' = 'YOUR_IMAGE_ID_HERE'
LIMIT 1;

-- Check recent images
SELECT 
    id,
    metadata->>'localId' as local_id,
    created_at
FROM images
ORDER BY created_at DESC
LIMIT 10;
```

### 3. Test Direct API Call
Run this in your terminal:
```bash
node test-image-deletion.js YOUR_IMAGE_ID
```

## Common Issues and Fixes

### Issue 1: Images Only in localStorage
**Symptom**: Images created before persistence was configured
**Fix**: These images can only be deleted from localStorage, not the database

### Issue 2: ID Format Mismatch
**Symptom**: Frontend uses `img_xxx` but database has UUID
**Fix**: Ensure images are saved with metadata containing localId:

```javascript
// When saving image
const imageData = {
  ...image,
  metadata: {
    localId: image.id, // Save the local ID
    ...otherMetadata
  }
}
```

### Issue 3: Missing Permissions
**Symptom**: Database returns permission denied
**Fix**: Check RLS policies on images table:

```sql
-- Ensure delete policy exists
CREATE POLICY "Users can delete their own images"
ON images FOR DELETE
TO authenticated
USING (true); -- Adjust based on your auth setup
```

## Immediate Workaround

If you need to delete images immediately:

1. **From Supabase Dashboard**:
   - Go to Table Editor → images
   - Find and delete the image manually

2. **Using SQL**:
```sql
-- Delete by URL pattern
DELETE FROM images 
WHERE url LIKE '%pattern%'
AND created_at > '2024-06-24'; -- Safety check

-- Delete by metadata
DELETE FROM images 
WHERE metadata->>'localId' = 'img_xxxxx';
```

## Permanent Fix

Replace the current deleteImage function with the enhanced version in `/lib/services/delete-image-enhanced.ts` which:
- Tries multiple methods to find the image
- Handles case-insensitive matching
- Provides better error logging
- Supports partial ID matching

To apply:
1. Back up current `chat-persistence.ts`
2. Copy the enhanced deleteImage function
3. Replace the existing function
4. Test with various image IDs

## Prevention

1. **Consistent ID Storage**: Always save localId in metadata when creating images
2. **Validation**: Add ID format validation before deletion
3. **Error Handling**: Show more specific error messages to users
4. **Logging**: Keep detailed logs of all deletion attempts

## Need More Help?

1. Check the app logs for detailed error messages
2. Run the SQL debug script to inspect your images table
3. Use the test script to isolate API issues
4. Check Supabase logs for database-level errors

The issue is most likely due to:
- Images existing only in localStorage (not synced to database)
- ID format mismatch between frontend and database
- Missing or incorrect metadata storage
