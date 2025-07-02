-- Fix metadata issues for existing images
-- Run this in Supabase SQL Editor if images can't be deleted

-- First, let's see the current state
SELECT 
    COUNT(*) as total_images,
    COUNT(CASE WHEN metadata IS NULL THEN 1 END) as no_metadata,
    COUNT(CASE WHEN metadata->>'localId' IS NULL THEN 1 END) as no_local_id
FROM images;

-- Show sample of problematic images
SELECT 
    id,
    metadata,
    created_at
FROM images
WHERE metadata IS NULL 
   OR metadata->>'localId' IS NULL
ORDER BY created_at DESC
LIMIT 5;

-- Fix 1: Add empty metadata object where missing
UPDATE images
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

-- Fix 2: Add localId based on image ID for images without it
-- This creates a localId like 'img_' + first 8 chars of UUID
UPDATE images
SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{localId}',
    to_jsonb('img_' || substring(id::text, 1, 8))
)
WHERE metadata->>'localId' IS NULL;

-- Verify the fixes
SELECT 
    COUNT(*) as total_images,
    COUNT(CASE WHEN metadata IS NULL THEN 1 END) as no_metadata,
    COUNT(CASE WHEN metadata->>'localId' IS NULL THEN 1 END) as no_local_id
FROM images;

-- Show the updated images
SELECT 
    id,
    metadata->>'localId' as local_id,
    metadata,
    created_at
FROM images
ORDER BY created_at DESC
LIMIT 10;

-- Optional: If you know specific image IDs that are failing
-- You can check them directly:
-- SELECT id, metadata FROM images WHERE id = 'your-image-uuid-here';
-- SELECT id, metadata FROM images WHERE metadata->>'localId' = 'img_abc123';