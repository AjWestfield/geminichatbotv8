-- Emergency Database Optimization Script
-- Run these commands in Supabase SQL Editor

-- 1. Clean up dead rows and update statistics
VACUUM ANALYZE messages;
VACUUM ANALYZE chats;
VACUUM ANALYZE images;
VACUUM ANALYZE videos;

-- 2. Create optimized compound index for messages
DROP INDEX IF EXISTS idx_messages_chat_id_created_at_desc;
CREATE INDEX CONCURRENTLY idx_messages_optimized 
ON messages(chat_id, created_at DESC) 
INCLUDE (id, role, content, attachments)
WHERE role IN ('user', 'assistant');

-- 3. Create partial index for recent messages
CREATE INDEX CONCURRENTLY idx_messages_recent 
ON messages(chat_id, created_at DESC) 
WHERE created_at > NOW() - INTERVAL '30 days';

-- 4. Optimize images table
CREATE INDEX CONCURRENTLY idx_images_chat_created 
ON images(chat_id, created_at DESC);

-- 5. Add query performance settings
ALTER DATABASE postgres SET random_page_cost = 1.1;
ALTER DATABASE postgres SET effective_cache_size = '256MB';

-- 6. Create materialized view for chat summaries
CREATE MATERIALIZED VIEW IF NOT EXISTS chat_summaries_fast AS
SELECT 
    c.id,
    c.created_at,
    c.updated_at,
    COUNT(DISTINCT m.id) FILTER (WHERE m.role = 'user') as message_count,
    COALESCE(
        (SELECT content FROM messages 
         WHERE chat_id = c.id AND role = 'user' 
         ORDER BY created_at ASC LIMIT 1),
        'New Chat'
    ) as first_message
FROM chats c
LEFT JOIN messages m ON c.id = m.chat_id
GROUP BY c.id;

CREATE INDEX ON chat_summaries_fast(created_at DESC);

-- 7. Refresh the materialized view
REFRESH MATERIALIZED VIEW chat_summaries_fast;
