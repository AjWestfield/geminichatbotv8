-- Database Optimization Script for Messages Table
-- This script addresses timeout issues with the messages table

-- ============================================
-- 1. ANALYZE TABLE STATISTICS
-- ============================================
ANALYZE messages;

-- ============================================
-- 2. OPTIMIZE INDEXES FOR MESSAGES TABLE
-- ============================================

-- Drop existing indexes if they exist (to recreate optimized versions)
DROP INDEX IF EXISTS idx_messages_chat_id;
DROP INDEX IF EXISTS idx_messages_created_at;

-- Create optimized indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_chat_id_created_at 
ON messages(chat_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_role 
ON messages(role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_content_search 
ON messages USING gin(to_tsvector('english', content));

-- ============================================
-- 3. VACUUM AND REINDEX
-- ============================================
VACUUM ANALYZE messages;

-- ============================================
-- 4. UPDATE TABLE STATISTICS
-- ============================================
ANALYZE messages;

-- ============================================
-- 5. CHECK TABLE HEALTH
-- ============================================
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename = 'messages';

-- ============================================
-- 6. VERIFY OPTIMIZATION
-- ============================================
SELECT 
    'Messages table optimization complete!' as status,
    (SELECT COUNT(*) FROM messages) as total_messages,
    (SELECT COUNT(DISTINCT chat_id) FROM messages) as unique_chats,
    (SELECT pg_size_pretty(pg_total_relation_size('messages'))) as table_size;