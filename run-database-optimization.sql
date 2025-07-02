-- Database Optimization Script for geminichatbotv7
-- Run these commands in Supabase SQL Editor
-- URL: https://bsocqrwrikfmymklgart.supabase.co/project/bsocqrwrikfmymklgart/sql/new

-- Step 1: Increase timeout for this session
SET statement_timeout = '60s';

-- Step 2: Create the critical index for chat message queries
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at_desc 
ON messages(chat_id, created_at DESC);

-- Step 3: Create additional helpful indexes
CREATE INDEX IF NOT EXISTS idx_messages_created_at 
ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chats_user_id_updated_at 
ON chats(user_id, updated_at DESC);

-- Step 4: Analyze tables to update statistics
ANALYZE messages;
ANALYZE chats;

-- Step 5: Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('messages', 'chats')
ORDER BY tablename, indexname;

-- Step 6: Check current table sizes
SELECT 
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    pg_size_pretty(pg_indexes_size(relid)) AS indexes_size
FROM pg_catalog.pg_statio_user_tables
WHERE relname IN ('messages', 'chats')
ORDER BY pg_total_relation_size(relid) DESC;

-- Step 7: Test query performance (optional)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM messages 
WHERE chat_id = '872f2da8-21e9-48f8-bd8d-af70ca7ee180' 
ORDER BY created_at DESC 
LIMIT 50;
