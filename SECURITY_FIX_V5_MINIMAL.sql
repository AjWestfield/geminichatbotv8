-- ============================================
-- SECURITY FIX - V5 MINIMAL
-- ============================================

-- 1. Drop problematic views
DROP VIEW IF EXISTS limited_images;
DROP VIEW IF EXISTS chat_summaries CASCADE;

-- 2. Create chat_summaries view with only existing columns
CREATE VIEW chat_summaries AS
SELECT 
    c.id,
    c.title,
    c.model,
    c.created_at,
    c.updated_at,
    c.metadata,
    -- Count aggregations
    (SELECT COUNT(*)::int FROM messages m WHERE m.chat_id = c.id) AS message_count,
    (SELECT COUNT(*)::int FROM images i WHERE i.chat_id = c.id) AS image_count,
    (SELECT COUNT(*)::int FROM videos v WHERE v.chat_id = c.id) AS video_count,
    -- Image thumbnails
    COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
            'id', i.id,
            'url', i.url,
            'prompt', i.prompt,
            'is_uploaded', i.is_uploaded,
            'model', i.model
        ) ORDER BY i.created_at DESC)
        FROM (
            SELECT * FROM images 
            WHERE chat_id = c.id 
            ORDER BY created_at DESC 
            LIMIT 6
        ) i
    ), '[]'::jsonb) AS image_thumbnails,
    -- Last message
    (SELECT m.content 
     FROM messages m 
     WHERE m.chat_id = c.id AND m.role = 'user' 
     ORDER BY m.created_at DESC 
     LIMIT 1) AS last_message
FROM chats c;

-- 3. Grant permissions
GRANT SELECT ON chat_summaries TO anon;
GRANT SELECT ON chat_summaries TO authenticated;

-- 4. Drop materialized view
DROP MATERIALIZED VIEW IF EXISTS chat_summaries_fast;

-- 5. Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 6. Create messages policy (simple version)
DROP POLICY IF EXISTS "Allow all operations on messages" ON messages;
CREATE POLICY "Allow all operations on messages" 
    ON messages 
    FOR ALL 
    USING (true);

-- 7. Success
SELECT 'Security fixes applied successfully!' AS status;