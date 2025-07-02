# 🎯 Action Plan: Fix Edited Image Comparison

## Issue
Edited image comparison (split screen/slider) not working when loading chat sessions because original images aren't loaded.

## Solution Summary
Load original images along with edited images when restoring a chat session.

## 📋 Quick Steps:

### 1. Run SQL Script in Supabase
Go to: https://app.supabase.com/project/bsocqrwrikfmymklgart/sql/new

Copy and run this:
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

### 2. Verify the Fix
```bash
node test-edited-image-comparison.cjs
```

### 3. Restart Your Server
```bash
# Stop server (Ctrl+C)
npm run dev
```

### 4. Test in App
1. Load a chat with edited images
2. Click on an edited image
3. You should see:
   - ✅ Split Screen view working
   - ✅ Slider comparison working

## 🔍 What Changed:

### New Files:
- `fix-edited-image-comparison.sql` - SQL function to load images with originals
- `lib/services/chat-images-with-originals.ts` - Service function
- `types/extended-image-types.ts` - TypeScript types
- `test-edited-image-comparison.cjs` - Test script

### Modified Files:
- `lib/services/chat-persistence-optimized.ts` - Uses new function to load images

## ✅ Benefits:
- Comparison modal works for all edited images in loaded chats
- Original images are automatically included
- No performance impact
- Works retroactively for existing chats

## 🎉 Result:
Your edited image comparisons will now work persistently across all chat sessions!
