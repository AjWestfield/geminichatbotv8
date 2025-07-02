-- Debug script to check image metadata in the database
-- Run this in your Supabase SQL Editor to see what's happening

-- First, check if there are any images at all
SELECT COUNT(*) as total_images FROM images;

-- Check the most recent 5 images and their metadata
SELECT 
    id,
    chat_id,
    created_at,
    metadata,
    metadata->>'localId' as extracted_local_id,
    CASE 
        WHEN metadata IS NULL THEN 'No metadata'
        WHEN metadata->>'localId' IS NULL THEN 'No localId in metadata'
        ELSE 'Has localId'
    END as metadata_status
FROM images
ORDER BY created_at DESC
LIMIT 5;

-- Check if there are any images without proper metadata
SELECT 
    COUNT(*) as images_without_metadata
FROM images
WHERE metadata IS NULL OR metadata->>'localId' IS NULL;

-- Try to find images with a specific pattern in their local IDs
SELECT 
    id,
    metadata->>'localId' as local_id,
    created_at
FROM images
WHERE metadata->>'localId' LIKE 'img_%'
ORDER BY created_at DESC
LIMIT 5;

-- Check the exact JSON structure of metadata for the most recent image
SELECT 
    id,
    jsonb_pretty(metadata) as formatted_metadata
FROM images
WHERE metadata IS NOT NULL
ORDER BY created_at DESC
LIMIT 1;