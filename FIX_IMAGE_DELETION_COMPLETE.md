# Image Deletion Fix Guide

## Issue
Images cannot be deleted from the Canvas view, showing error: "Image not found or could not be deleted"

## Root Cause
The issue occurs when the database cannot find images by their local ID (e.g., `img_abc123`) which is stored in the metadata field. This can happen due to:

1. Metadata field not being properly set when images are saved
2. JSONB query syntax issues in PostgreSQL
3. Missing RPC helper function

## Solution Applied

### 1. Enhanced API Error Handling
Updated `/app/api/images/[id]/route.ts` to:
- Add more detailed logging
- Try multiple query methods to find images
- Provide better debug information

### 2. Create RPC Function (Run in Supabase SQL Editor)
```sql
-- Create helper function for image lookup
CREATE OR REPLACE FUNCTION get_image_by_local_id(local_id TEXT)
RETURNS TABLE (
    id UUID,
    url TEXT,
    metadata JSONB,
    chat_id UUID
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.url,
        i.metadata,
        i.chat_id
    FROM public.images i
    WHERE 
        i.metadata->>'localId' = local_id
        OR i.metadata @> jsonb_build_object('localId', local_id)
    LIMIT 1;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_image_by_local_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_image_by_local_id(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_image_by_local_id(TEXT) TO service_role;
```

### 3. Debug Your Images (Run in Supabase SQL Editor)
```sql
-- Check recent images and their metadata
SELECT 
    id,
    chat_id,
    created_at,
    metadata,
    metadata->>'localId' as local_id,
    CASE 
        WHEN metadata IS NULL THEN 'No metadata'
        WHEN metadata->>'localId' IS NULL THEN 'No localId'
        ELSE 'OK'
    END as status
FROM images
ORDER BY created_at DESC
LIMIT 10;

-- Fix images without localId (if needed)
UPDATE images
SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{localId}',
    to_jsonb(id::text)
)
WHERE metadata IS NULL 
   OR metadata->>'localId' IS NULL;
```

## Testing

1. **Test with Node script:**
```bash
node test-image-deletion.js <imageId>
```

2. **Check server logs:**
Look for `[API] DELETE` and `[DELETE IMAGE]` messages in your terminal

3. **Manual test:**
- Go to Canvas view
- Try deleting an image
- Check browser console and server logs

## If Still Not Working

1. **Check image format:**
   - Ensure images have proper metadata when saved
   - Verify local IDs match expected format (e.g., `img_xyz123`)

2. **Clear and regenerate:**
   - Clear browser cache
   - Generate a new test image
   - Try deleting the newly generated image

3. **Database check:**
   - Run the debug SQL queries above
   - Verify images table has proper structure
   - Check if metadata column exists and is JSONB type

## Quick Fix Applied
The API route has been updated with better error handling and multiple fallback queries. After running the SQL commands above, image deletion should work properly.
