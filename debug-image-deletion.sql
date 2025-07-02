-- Debug script to check images table and find issues with image deletion
-- Run this in Supabase SQL Editor

-- 1. Check if images table exists and show its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'images'
ORDER BY ordinal_position;

-- 2. Check recent images and their metadata
SELECT 
    id,
    chat_id,
    url,
    prompt,
    metadata,
    created_at,
    LENGTH(id::text) as id_length,
    CASE 
        WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN 'Valid UUID' 
        ELSE 'Invalid UUID' 
    END as uuid_validation
FROM images
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check for images with localId in metadata
SELECT 
    id,
    metadata->>'localId' as local_id,
    url,
    created_at
FROM images
WHERE metadata ? 'localId'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check permissions on images table
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE table_name = 'images';

-- 5. Check RLS policies on images table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'images';

-- 6. Test finding an image by various methods
-- Replace 'YOUR_IMAGE_ID' with an actual image ID from your Canvas
WITH test_id AS (
    SELECT 'YOUR_IMAGE_ID'::text as search_id
)
SELECT 
    'By UUID' as search_method,
    id,
    url,
    metadata
FROM images, test_id
WHERE id::text = test_id.search_id
UNION ALL
SELECT 
    'By LocalId' as search_method,
    id,
    url,
    metadata
FROM images, test_id
WHERE metadata->>'localId' = test_id.search_id;
