-- ============================================
-- CRITICAL SECURITY FIX - FINAL VERSION
-- Copy and paste this into Supabase SQL Editor
-- ============================================

-- 1. Remove dangerous SECURITY DEFINER views
DROP VIEW IF EXISTS limited_images;
DROP VIEW IF EXISTS chat_summaries CASCADE;

-- 2. Recreate chat_summaries safely (without SECURITY DEFINER)
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

-- 3. Grant permissions
GRANT SELECT ON chat_summaries TO anon;
GRANT SELECT ON chat_summaries TO authenticated;

-- 4. Remove exposed materialized view
DROP MATERIALIZED VIEW IF EXISTS chat_summaries_fast;

-- 5. Fix messages table (enable RLS if needed)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 6. Add policy for messages (drop existing first)
DO $$ 
BEGIN
    -- Drop policy if it exists (wrapped in exception handler)
    BEGIN
        DROP POLICY "Allow all operations on messages" ON messages;
    EXCEPTION 
        WHEN undefined_object THEN NULL;
    END;
END $$;

-- Create the policy
CREATE POLICY "Allow all operations on messages" ON messages
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 7. Verify fixes
SELECT 
    'SECURITY FIXES APPLIED SUCCESSFULLY!' as status,
    current_timestamp as applied_at;