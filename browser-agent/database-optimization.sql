-- Database optimization suggestions for chat loading performance

-- 1. Check existing indexes on messages table
-- Run this query to see current indexes:
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'messages'
ORDER BY indexname;
*/

-- 2. Recommended index for chat message queries
-- This composite index will speed up the chat loading query
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at 
ON messages(chat_id, created_at ASC);

-- 3. Analyze table statistics for query planner
ANALYZE messages;

-- 4. Check query performance
-- Use EXPLAIN ANALYZE to see the query plan:
/*
EXPLAIN ANALYZE
SELECT 
    id,
    chat_id,
    role,
    content,
    created_at,
    attachments
FROM messages
WHERE chat_id = 'your-chat-id-here'
ORDER BY created_at ASC;
*/

-- 5. Optional: Partial index for large attachments
-- If attachments are causing slowdowns, consider a partial index
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_no_attachments 
ON messages(chat_id, created_at) 
WHERE attachments IS NULL OR jsonb_array_length(attachments) = 0;

-- 6. Vacuum the table to reclaim space and update statistics
VACUUM ANALYZE messages;

-- 7. Consider increasing statement timeout for specific queries
-- This can be done at the connection level in Supabase:
/*
SET statement_timeout = '30s'; -- Increase from default
*/

-- 8. Monitor slow queries
-- Check pg_stat_statements for slow queries:
/*
SELECT 
    query,
    mean_exec_time,
    calls,
    total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%messages%'
ORDER BY mean_exec_time DESC
LIMIT 10;
*/