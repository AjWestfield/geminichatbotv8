-- Verification script to check image persistence is working correctly
-- Run this after applying the fix scripts

-- 1. Check if default chat was created
SELECT 
    'Default Upload Chat' as check_type,
    CASE 
        WHEN EXISTS(SELECT 1 FROM chats WHERE title = 'Direct Image Uploads')
        THEN 'PASS ✓'
        ELSE 'FAIL ✗'
    END as status,
    (SELECT id::TEXT FROM chats WHERE title = 'Direct Image Uploads' LIMIT 1) as chat_id;

-- 2. Check if trigger is created
SELECT 
    'Image Chat Association Trigger' as check_type,
    CASE 
        WHEN EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'ensure_image_chat')
        THEN 'PASS ✓'
        ELSE 'FAIL ✗'
    END as status,
    'ensure_image_chat_association' as function_name;

-- 3. Check for orphaned images
SELECT 
    'Orphaned Images Check' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS ✓'
        ELSE 'FAIL ✗ (' || COUNT(*) || ' orphaned images found)'
    END as status,
    COUNT(*)::TEXT as orphan_count
FROM images 
WHERE chat_id IS NULL;

-- 4. Check RLS policies
SELECT 
    'RLS Policies' as check_type,
    CASE 
        WHEN COUNT(*) > 0 THEN 'PASS ✓'
        ELSE 'FAIL ✗'
    END as status,
    COUNT(*)::TEXT || ' policies found' as details
FROM pg_policies 
WHERE tablename = 'images';

-- 5. Check recent uploaded images
WITH recent_uploads AS (
    SELECT * FROM images 
    WHERE is_uploaded = true 
    AND created_at > NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC
)
SELECT 
    'Recent Uploaded Images' as check_type,
    CASE 
        WHEN COUNT(*) > 0 THEN 'Found ' || COUNT(*) || ' uploads'
        ELSE 'No recent uploads'
    END as status,
    jsonb_agg(jsonb_build_object(
        'id', id,
        'prompt', substring(prompt, 1, 30),
        'chat_id', chat_id,
        'created_at', created_at
    )) as recent_images
FROM recent_uploads;

-- 6. Check URL types distribution
SELECT 
    'URL Types Distribution' as check_type,
    'See breakdown' as status,
    jsonb_build_object(
        'data_urls', COUNT(CASE WHEN url LIKE 'data:%' THEN 1 END),
        'blob_urls', COUNT(CASE WHEN url LIKE 'blob:%' THEN 1 END),
        'https_urls', COUNT(CASE WHEN url LIKE 'https:%' THEN 1 END),
        'empty_urls', COUNT(CASE WHEN url IS NULL OR url = '' THEN 1 END),
        'total', COUNT(*)
    )::TEXT as url_breakdown
FROM images;

-- 7. Test the API view
SELECT 
    'API View Test' as check_type,
    CASE 
        WHEN COUNT(*) > 0 THEN 'PASS ✓ (' || COUNT(*) || ' images visible)'
        ELSE 'FAIL ✗ (No images visible through API view)'
    END as status,
    COUNT(*)::TEXT as visible_count
FROM api_images;

-- 8. Check chat summaries view
SELECT 
    'Chat Summaries View' as check_type,
    CASE 
        WHEN SUM(image_count) > 0 THEN 'PASS ✓ (' || SUM(image_count) || ' total images)'
        ELSE 'FAIL ✗ (No images in chat summaries)'
    END as status,
    jsonb_build_object(
        'total_chats', COUNT(*),
        'chats_with_images', COUNT(CASE WHEN image_count > 0 THEN 1 END),
        'total_images', COALESCE(SUM(image_count), 0)
    )::TEXT as details
FROM chat_summaries;

-- 9. Summary report
WITH stats AS (
    SELECT 
        COUNT(*) as total_images,
        COUNT(CASE WHEN is_uploaded = true THEN 1 END) as uploaded_count,
        COUNT(CASE WHEN chat_id IS NULL THEN 1 END) as orphan_count,
        COUNT(DISTINCT chat_id) as chat_count,
        COUNT(CASE WHEN url LIKE 'https:%' THEN 1 END) as permanent_urls,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_hour
    FROM images
)
SELECT 
    '=== PERSISTENCE STATUS SUMMARY ===' as report,
    jsonb_pretty(jsonb_build_object(
        'total_images', total_images,
        'uploaded_images', uploaded_count,
        'orphaned_images', orphan_count,
        'unique_chats', chat_count,
        'permanent_urls', permanent_urls,
        'images_last_hour', recent_hour,
        'health_status', CASE 
            WHEN orphan_count = 0 AND permanent_urls > 0 THEN 'HEALTHY ✓'
            WHEN orphan_count > 0 THEN 'NEEDS ATTENTION - Orphaned images found'
            WHEN permanent_urls = 0 THEN 'WARNING - No permanent URLs'
            ELSE 'CHECK REQUIRED'
        END
    )) as status
FROM stats;