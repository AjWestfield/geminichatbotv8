-- ============================================
-- EMERGENCY DATABASE PERFORMANCE OPTIMIZATION
-- ============================================
-- Run this script line by line or section by section to avoid transaction issues

-- 1. FIRST, ANALYZE TABLES FOR IMMEDIATE IMPROVEMENT
ANALYZE chats;
ANALYZE messages;
ANALYZE images;
ANALYZE videos;
ANALYZE audios;

-- 2. CREATE CRITICAL INDEX FOR CHAT MESSAGE QUERIES
-- This is the most important index for fixing timeout issues
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at_desc 
ON messages(chat_id, created_at DESC);

-- 3. CREATE OTHER HELPFUL INDEXES (run one at a time if needed)
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at_desc ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_id ON chats(id);
CREATE INDEX IF NOT EXISTS idx_images_chat_id ON images(chat_id);
CREATE INDEX IF NOT EXISTS idx_videos_chat_id ON videos(chat_id);

-- 4. CHECK EXISTING INDEXES
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('messages', 'chats', 'images', 'videos')
ORDER BY tablename, indexname;

-- 5. CHECK TABLE SIZES AND ROW COUNTS
SELECT 
    'messages' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('messages')) as total_size
FROM messages
UNION ALL
SELECT 
    'chats' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('chats')) as total_size
FROM chats;

-- 6. OPTIONAL: VACUUM TABLES (run separately if needed)
-- VACUUM ANALYZE messages;
-- VACUUM ANALYZE chats;

-- 7. CHECK SLOW QUERIES (to identify other issues)
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    min_time,
    max_time
FROM pg_stat_statements
WHERE query LIKE '%messages%'
ORDER BY mean_time DESC
LIMIT 10;