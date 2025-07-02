-- Test the actual queries used by the API
-- This helps verify that the API endpoints are working correctly

-- 1. Test the exact query used by getAllImages API
-- This mimics what happens in /api/images GET endpoint
EXPLAIN ANALYZE
SELECT * FROM images
ORDER BY created_at DESC
LIMIT 100;

-- Show actual results
SELECT 
    id,
    chat_id,
    substring(prompt, 1, 50) as prompt_preview,
    model,
    is_uploaded,
    created_at,
    substring(url, 1, 30) as url_preview
FROM images
ORDER BY created_at DESC
LIMIT 10;

-- 2. Test image save operation (what happens in POST /api/images)
-- This is a dry run - doesn't actually insert
EXPLAIN (ANALYZE, BUFFERS)
INSERT INTO images (
    chat_id,
    message_id,
    url,
    prompt,
    revised_prompt,
    quality,
    style,
    size,
    model,
    is_uploaded,
    metadata
) VALUES (
    (SELECT id FROM chats WHERE title = 'Direct Image Uploads' LIMIT 1),
    NULL,
    'https://example.com/test.png',
    'Test image',
    'Test image',
    'standard',
    'vivid',
    '1024x1024',
    'uploaded-image',
    true,
    jsonb_build_object('localId', 'img_test_123', 'test', true)
) RETURNING *;

-- 3. Test loading images for a specific chat
-- This shows what chat persistence loads
WITH test_chat AS (
    SELECT id FROM chats 
    WHERE title = 'Direct Image Uploads' 
    LIMIT 1
)
SELECT 
    COUNT(*) as image_count,
    COUNT(CASE WHEN is_uploaded = true THEN 1 END) as uploaded_count
FROM images 
WHERE chat_id = (SELECT id FROM test_chat);

-- 4. Check if images are properly indexed
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'images'
ORDER BY indexname;

-- 5. Performance check for image queries
SELECT 
    'Query Performance' as check_type,
    query,
    calls,
    mean_exec_time,
    total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%images%'
    AND query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 5;

-- 6. Test the chat_summaries view performance
EXPLAIN ANALYZE
SELECT * FROM chat_summaries
ORDER BY updated_at DESC
LIMIT 10;

-- 7. Check for any blocking issues
SELECT 
    'Active Queries on Images Table' as check_type,
    pid,
    usename,
    application_name,
    state,
    query_start,
    state_change,
    substring(query, 1, 100) as query_preview
FROM pg_stat_activity
WHERE query LIKE '%images%'
    AND state != 'idle'
    AND pid != pg_backend_pid();