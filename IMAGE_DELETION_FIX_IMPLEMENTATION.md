# Image Deletion Fix - Implementation Plan & Solution

## Root Cause Analysis

After thorough investigation, the root cause of the image deletion failure is:

1. **ID Mismatch**: Frontend uses local IDs (e.g., `img_abc123`) while the database stores UUIDs
2. **Metadata Query Issues**: The JSONB queries for finding images by localId in metadata field are failing
3. **Missing Fallback Logic**: The API wasn't properly handling the conversion from local ID to database UUID

## Implementation Plan

### 1. Enhanced API Route (✅ COMPLETED)
- Updated `/app/api/images/[id]/route.ts` with:
  - Multiple query methods to find images by local ID
  - Better error logging and debugging
  - Support for both UUID and local ID formats
  - Fallback queries for different JSONB syntax

### 2. Database Functions (TO DO)
Run these SQL commands in Supabase:

```sql
-- Create helper function for better metadata queries
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

-- Fix any existing images without proper metadata
UPDATE images
SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{localId}',
    to_jsonb('img_' || substring(id::text, 1, 8))
)
WHERE metadata IS NULL OR metadata->>'localId' IS NULL;
```

### 3. Testing Strategy

#### Manual Testing Steps:
1. Generate a new image in the chat
2. Go to Canvas → Images tab
3. Hover over the image and click delete
4. Confirm deletion in the dialog
5. Verify image is removed from gallery

#### Automated E2E Test (✅ CREATED)
- Test file: `/e2e/test-image-deletion.spec.ts`
- Tests image generation, deletion, and verification
- Run with: `npx playwright test e2e/test-image-deletion.spec.ts`

## Solution Summary

The fix implements a robust image deletion system that:

1. **Handles both ID formats**: Works with UUIDs and local IDs
2. **Multiple query methods**: Uses 3 different JSONB query approaches
3. **RPC function fallback**: Uses stored procedure if queries fail
4. **Better error handling**: Provides detailed error messages and logging
5. **Database consistency**: Ensures metadata is properly set on all images

## Files Modified

1. `/app/api/images/[id]/route.ts` - Enhanced deletion API
2. `/e2e/test-image-deletion.spec.ts` - Comprehensive E2E tests
3. SQL scripts for database fixes

## Next Steps

1. Run the SQL commands in Supabase to create the helper function
2. Restart the development server
3. Test image deletion manually
4. Run the E2E tests for verification

## Debugging Commands

If issues persist, use these debugging tools:

```bash
# Check recent images and their metadata
node debug-image-deletion.js

# Test deletion directly
node test-image-deletion.js <imageId>

# Run E2E tests
npx playwright test e2e/test-image-deletion.spec.ts --headed
```

## Expected Result

After implementing this fix:
- Images can be deleted using their local ID (e.g., `img_abc123`)
- The API will find the correct database UUID and delete the image
- Both database and blob storage will be cleaned up
- The UI will update immediately to reflect the deletion
