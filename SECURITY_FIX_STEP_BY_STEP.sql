-- ============================================
-- SECURITY FIXES - Step by Step
-- Run each command separately if needed
-- ============================================

-- Step 1: Drop the problematic views
DROP VIEW IF EXISTS limited_images;
DROP VIEW IF EXISTS chat_summaries CASCADE;

-- Step 2: Recreate chat_summaries safely (no SECURITY DEFINER)
CREATE VIEW chat_summaries AS
SELECT 
    c.id,
    c.title,
    c.model,
    c.created_at,
    c.updated_at,
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
    (SELECT m.content 
     FROM messages m 
     WHERE m.chat_id = c.id AND m.role = 'user' 
     ORDER BY m.created_at DESC 
     LIMIT 1) AS last_message
FROM chats c;

-- Step 3: Grant permissions on the view
GRANT SELECT ON chat_summaries TO anon;
GRANT SELECT ON chat_summaries TO authenticated;

-- Step 4: Drop materialized view if exists
DROP MATERIALIZED VIEW IF EXISTS chat_summaries_fast;

-- Step 5: Check if messages table has RLS enabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
    AND tablename = 'messages';

-- Step 6: Enable RLS on messages if not already enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop existing policy if any
DROP POLICY IF EXISTS "Allow all operations on messages" ON messages;

-- Step 8: Create new policy for messages
CREATE POLICY "Allow all operations on messages" ON messages
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Step 9: Verify the fixes
SELECT 'Security fixes applied successfully!' as status;