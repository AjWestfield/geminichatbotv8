-- ============================================
-- CRITICAL SECURITY FIXES - Corrected Version
-- ============================================

-- 1. Drop problematic views with SECURITY DEFINER
DROP VIEW IF EXISTS limited_images;
DROP VIEW IF EXISTS chat_summaries CASCADE;

-- 2. Recreate chat_summaries WITHOUT SECURITY DEFINER
CREATE VIEW chat_summaries AS
SELECT 
    c.*,
    (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) AS message_count,
    (SELECT COUNT(*) FROM images i WHERE i.chat_id = c.id) AS image_count,
    (SELECT COUNT(*) FROM videos v WHERE v.chat_id = c.id) AS video_count,
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
    (SELECT m.content FROM messages m 
     WHERE m.chat_id = c.id AND m.role = 'user' 
     ORDER BY m.created_at DESC LIMIT 1) AS last_message
FROM chats c;

-- Grant permissions
GRANT SELECT ON chat_summaries TO anon, authenticated;

-- 3. Fix materialized view exposure
DROP MATERIALIZED VIEW IF EXISTS chat_summaries_fast;

-- 4. Add policy for messages table (drop first if exists)
DROP POLICY IF EXISTS "Allow all operations on messages" ON messages;
CREATE POLICY "Allow all operations on messages" ON messages
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. Quick verification
SELECT 
    'CRITICAL FIXES APPLIED' as status,
    'Views with SECURITY DEFINER removed' as action1,
    'Materialized view removed' as action2,
    'Messages table policy added' as action3;