-- Check if optimizations were applied
-- Run this in Supabase SQL Editor

-- 1. Check if indexes exist
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes 
WHERE tablename = 'messages' 
AND indexname LIKE '%optimized%';

-- 2. Check if materialized view exists
SELECT 
    matviewname 
FROM pg_matviews 
WHERE matviewname = 'chat_summaries_fast';

-- 3. Test query performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM messages 
WHERE chat_id = (SELECT id FROM chats LIMIT 1)
ORDER BY created_at DESC 
LIMIT 50;
