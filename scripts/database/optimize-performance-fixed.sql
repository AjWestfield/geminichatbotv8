-- ============================================
-- DATABASE PERFORMANCE OPTIMIZATION (FIXED)
-- ============================================

-- 1. ANALYZE ALL TABLES FOR BETTER QUERY PLANNING
ANALYZE chats;
ANALYZE messages;
ANALYZE images;
ANALYZE videos;
ANALYZE audios;
ANALYZE social_media_cookies;

-- 2. CREATE OPTIMIZED INDEXES FOR MESSAGES TABLE
-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_messages_chat_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_role;
DROP INDEX IF EXISTS idx_messages_content_search;

-- Create optimized composite indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at 
ON messages(chat_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_role_created_at 
ON messages(role, created_at DESC);

-- Skip the full-text search index due to large messages
-- Instead, create a partial index on message content length for performance
CREATE INDEX IF NOT EXISTS idx_messages_content_length 
ON messages(length(content));

-- 3. OPTIMIZE OTHER TABLES
CREATE INDEX IF NOT EXISTS idx_chats_created_at 
ON chats(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chats_updated_at 
ON chats(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_images_chat_id 
ON images(chat_id);

CREATE INDEX IF NOT EXISTS idx_videos_chat_id 
ON videos(chat_id);

CREATE INDEX IF NOT EXISTS idx_audios_chat_id 
ON audios(chat_id);

-- 4. UPDATE TABLE STATISTICS (without VACUUM which might fail on large data)
ANALYZE chats;
ANALYZE messages;
ANALYZE images;
ANALYZE videos;
ANALYZE audios;
ANALYZE social_media_cookies;

-- 5. PERFORMANCE VERIFICATION QUERIES
SELECT 
    'Database optimization complete!' as status,
    (SELECT COUNT(*) FROM messages) as total_messages,
    (SELECT COUNT(DISTINCT chat_id) FROM messages) as unique_chats,
    (SELECT pg_size_pretty(pg_total_relation_size('messages'))) as messages_table_size,
    (SELECT pg_size_pretty(pg_database_size(current_database()))) as total_database_size;

-- 6. CHECK FOR LARGE MESSAGES
SELECT 
    'Large messages check' as check_type,
    COUNT(*) as large_message_count,
    pg_size_pretty(MAX(length(content)::bigint)) as largest_message_size,
    pg_size_pretty(AVG(length(content))::bigint) as avg_message_size
FROM messages
WHERE length(content) > 1000000;

-- 7. VERIFY INDEXES CREATED
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'messages'
ORDER BY indexname;