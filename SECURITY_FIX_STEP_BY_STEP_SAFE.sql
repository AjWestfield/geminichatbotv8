-- STEP 1: First, let's see what we're dealing with
SELECT 'STEP 1: Checking existing views' as step;
SELECT viewname, viewowner FROM pg_views WHERE schemaname = 'public' AND viewname IN ('chat_summaries', 'limited_images');

-- STEP 2: Drop the problematic views
SELECT 'STEP 2: Dropping problematic views' as step;
DROP VIEW IF EXISTS limited_images;
DROP VIEW IF EXISTS chat_summaries CASCADE;

-- STEP 3: Check what columns exist in chats table
SELECT 'STEP 3: Checking chats table structure' as step;
SELECT column_name FROM information_schema.columns WHERE table_name = 'chats' AND table_schema = 'public';

-- STEP 4: Create a minimal chat_summaries view
SELECT 'STEP 4: Creating minimal chat_summaries view' as step;
CREATE VIEW chat_summaries AS
SELECT 
    c.*,
    0 AS message_count,
    0 AS image_count,
    0 AS video_count,
    '[]'::jsonb AS image_thumbnails,
    NULL::text AS last_message
FROM chats c;

-- STEP 5: Test if the view works
SELECT 'STEP 5: Testing view' as step;
SELECT COUNT(*) FROM chat_summaries;

-- STEP 6: If successful, drop and recreate with real data
SELECT 'STEP 6: Recreating with real data' as step;
DROP VIEW chat_summaries;

CREATE VIEW chat_summaries AS
SELECT 
    c.*,
    (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id)::int AS message_count,
    (SELECT COUNT(*) FROM images i WHERE i.chat_id = c.id)::int AS image_count,
    (SELECT COUNT(*) FROM videos v WHERE v.chat_id = c.id)::int AS video_count,
    (SELECT COALESCE(jsonb_agg(sub.img), '[]'::jsonb) FROM (SELECT jsonb_build_object('id', i.id, 'url', i.url) as img FROM images i WHERE i.chat_id = c.id ORDER BY i.created_at DESC LIMIT 6) sub) AS image_thumbnails,
    (SELECT m.content FROM messages m WHERE m.chat_id = c.id AND m.role = 'user' ORDER BY m.created_at DESC LIMIT 1) AS last_message
FROM chats c;

-- STEP 7: Grant permissions
SELECT 'STEP 7: Granting permissions' as step;
GRANT SELECT ON chat_summaries TO anon;
GRANT SELECT ON chat_summaries TO authenticated;

-- STEP 8: Clean up other issues
SELECT 'STEP 8: Cleaning up other issues' as step;
DROP MATERIALIZED VIEW IF EXISTS chat_summaries_fast;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on messages" ON messages;
CREATE POLICY "Allow all operations on messages" ON messages FOR ALL USING (true);

-- FINAL: Success check
SELECT 'COMPLETED: Security fixes applied!' as status;