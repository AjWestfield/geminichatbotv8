# Fix for Edited Image Comparison in Loaded Chat Sessions

## Problem
When loading a chat session that contains edited images, the comparison modal (split screen/slider view) doesn't work because the original images are not loaded with the chat.

## Solution
We need to ensure that when loading images for a chat, we also load any original images that edited images reference.

## Implementation Steps

### 1. Run SQL Script in Supabase
First, run this SQL script in your Supabase SQL Editor to create a function that loads images with their originals:

```sql
-- Copy and run the contents of: fix-edited-image-comparison.sql
```

### 2. Update Code Files
The following files have been updated:

1. **`lib/services/chat-images-with-originals.ts`** - New function to load images with originals
2. **`lib/services/chat-persistence-optimized.ts`** - Updated to use the new function

### 3. How It Works

The new database function `get_chat_images_with_originals`:
- Loads all images directly belonging to a chat
- Identifies which images are edited (have an `original_image_id`)
- Also loads the original images referenced by edited images
- Returns both sets combined

### 4. Testing

1. Load a chat session that contains edited images
2. Click on an edited image in the gallery
3. The comparison modal should now show both:
   - Split Screen view with original and edited side by side
   - Slider view for interactive comparison

### 5. Benefits

- ✅ Comparison modal works for all edited images
- ✅ Original images are loaded automatically
- ✅ Works for both new and existing chat sessions
- ✅ No performance impact (uses efficient SQL query)

## SQL Script to Run

Go to your [Supabase SQL Editor](https://app.supabase.com/project/bsocqrwrikfmymklgart/sql/new) and run:

```sql
-- Fix for edited image comparison not working in loaded chat sessions
-- This ensures original images are loaded along with edited images

-- Step 1: Create a function to get original images for edited images in a chat
CREATE OR REPLACE FUNCTION get_chat_images_with_originals(p_chat_id UUID)
RETURNS TABLE (
  id UUID,
  chat_id UUID,
  message_id UUID,
  url TEXT,
  prompt TEXT,
  revised_prompt TEXT,
  quality TEXT,
  style TEXT,
  size TEXT,
  model TEXT,
  is_uploaded BOOLEAN,
  original_image_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  is_original_for_edit BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH chat_images AS (
    -- Get all images directly belonging to the chat
    SELECT 
      i.*,
      false AS is_original_for_edit
    FROM images i
    WHERE i.chat_id = p_chat_id
  ),
  original_image_ids AS (
    -- Get IDs of original images referenced by edited images
    SELECT DISTINCT original_image_id
    FROM chat_images
    WHERE original_image_id IS NOT NULL
  ),
  original_images AS (
    -- Get the original images that are referenced
    SELECT 
      i.*,
      true AS is_original_for_edit
    FROM images i
    WHERE i.id IN (SELECT original_image_id FROM original_image_ids)
    AND i.id NOT IN (SELECT id FROM chat_images) -- Don't duplicate if already in chat
  )
  -- Combine both sets
  SELECT * FROM chat_images
  UNION ALL
  SELECT * FROM original_images
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Grant permissions
GRANT EXECUTE ON FUNCTION get_chat_images_with_originals(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_chat_images_with_originals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_images_with_originals(UUID) TO service_role;
```

## After Running the Script

1. **Restart your development server** to ensure the changes take effect
2. **Test with a chat** that has edited images
3. The comparison modal should now work properly!

## Troubleshooting

If the comparison still doesn't work:

1. Check browser console for errors
2. Verify the SQL function was created:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'get_chat_images_with_originals';
   ```
3. Check that original images exist in the database:
   ```sql
   SELECT id, original_image_id, prompt 
   FROM images 
   WHERE original_image_id IS NOT NULL 
   LIMIT 5;
   ```
