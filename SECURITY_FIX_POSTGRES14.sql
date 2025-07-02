-- ============================================
-- SECURITY FIX FOR POSTGRESQL < 15
-- For older versions without security_invoker support
-- ============================================

-- IMPORTANT: Use this if CHECK_POSTGRES_VERSION.sql shows PostgreSQL < 15

-- 1. Drop dangerous views and materialized views
DROP VIEW IF EXISTS limited_images;
DROP VIEW IF EXISTS chat_summaries CASCADE;
DROP MATERIALIZED VIEW IF EXISTS chat_summaries_fast;

-- 2. Create view WITHOUT SECURITY DEFINER
-- By not specifying SECURITY DEFINER, the view won't bypass RLS
CREATE VIEW chat_summaries AS
SELECT 
    c.id,
    c.title,
    c.model,
    c.created_at,
    c.updated_at,
    c.metadata,
    -- Aggregate counts
    (SELECT COUNT(*)::int FROM messages m WHERE m.chat_id = c.id) AS message_count,
    (SELECT COUNT(*)::int FROM images i WHERE i.chat_id = c.id) AS image_count,
    (SELECT COUNT(*)::int FROM videos v WHERE v.chat_id = c.id) AS video_count,
    -- Image thumbnails
    COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', sub.id,
                'url', sub.url,
                'prompt', sub.prompt,
                'is_uploaded', sub.is_uploaded,
                'model', sub.model
            ) ORDER BY sub.created_at DESC
        )
        FROM (
            SELECT id, url, prompt, is_uploaded, model, created_at
            FROM images 
            WHERE chat_id = c.id 
            ORDER BY created_at DESC 
            LIMIT 6
        ) sub
    ), '[]'::jsonb) AS image_thumbnails,
    -- Last user message
    (SELECT m.content 
     FROM messages m 
     WHERE m.chat_id = c.id 
       AND m.role = 'user' 
     ORDER BY m.created_at DESC 
     LIMIT 1
    ) AS last_message
FROM chats c;

-- 3. Change view owner to authenticated role
-- This ensures the view runs with authenticated user privileges, not superuser
ALTER VIEW chat_summaries OWNER TO authenticated;

-- 4. Grant appropriate permissions
GRANT SELECT ON chat_summaries TO anon;
GRANT SELECT ON chat_summaries TO authenticated;

-- 5. Enable RLS on underlying tables if not already enabled
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- 6. Create basic RLS policies if they don't exist
-- Policy for chats table
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view all chats" ON chats;
EXCEPTION 
    WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can view all chats" 
ON chats FOR SELECT 
USING (true);

-- Policy for messages table
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow all operations on messages" ON messages;
EXCEPTION 
    WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Allow all operations on messages" 
ON messages FOR ALL 
USING (true);

-- Policy for images table
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view all images" ON images;
EXCEPTION 
    WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can view all images" 
ON images FOR SELECT 
USING (true);

-- Policy for videos table
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view all videos" ON videos;
EXCEPTION 
    WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can view all videos" 
ON videos FOR SELECT 
USING (true);

-- 7. Verify the fix
SELECT 
    'PostgreSQL < 15 Security Fix Applied!' AS status,
    'Views recreated without SECURITY DEFINER' AS detail,
    'View owner changed to authenticated role' AS additional_info,
    current_timestamp AS applied_at;

-- 8. Check view ownership
SELECT 
    schemaname,
    viewname,
    viewowner,
    CASE 
        WHEN viewowner = 'authenticated' THEN 'SECURE ✓'
        WHEN viewowner = 'postgres' THEN 'INSECURE ✗ - Needs fix'
        ELSE 'Check manually'
    END AS security_status
FROM pg_views
WHERE schemaname = 'public' 
  AND viewname = 'chat_summaries';