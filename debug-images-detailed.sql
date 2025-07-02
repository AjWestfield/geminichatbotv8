-- Debug query to see what's in your images table
-- Run this in Supabase SQL Editor

-- 1. Show all images with their IDs and metadata
SELECT 
    id,
    chat_id,
    url,
    metadata,
    metadata->>'localId' as local_id,
    created_at
FROM images
ORDER BY created_at DESC
LIMIT 20;

-- 2. Test the metadata query syntax
SELECT 
    id,
    metadata->>'localId' as method1,
    metadata->>localId as method2,
    jsonb_extract_path_text(metadata, 'localId') as method3
FROM images
WHERE metadata IS NOT NULL
LIMIT 5;

-- 3. Check if any images have null metadata
SELECT COUNT(*) as images_without_metadata
FROM images
WHERE metadata IS NULL;

-- 4. Look for a specific image by various methods (replace 'YOUR_ID' with actual ID)
WITH search_id AS (
    SELECT 'YOUR_ID'::text as id
)
SELECT 
    'Direct ID match' as search_method,
    i.*
FROM images i, search_id s
WHERE i.id::text = s.id
UNION ALL
SELECT 
    'Metadata localId match' as search_method,
    i.*
FROM images i, search_id s
WHERE i.metadata->>'localId' = s.id
UNION ALL
SELECT 
    'Partial ID match' as search_method,
    i.*
FROM images i, search_id s
WHERE i.id::text LIKE s.id || '%'
   OR i.metadata->>'localId' LIKE s.id || '%';
