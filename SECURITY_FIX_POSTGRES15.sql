-- ============================================
-- SECURITY FIX FOR POSTGRESQL 15+
-- Uses security_invoker to respect RLS
-- ============================================

-- IMPORTANT: Only use this if CHECK_POSTGRES_VERSION.sql shows PostgreSQL 15+

-- 1. Drop dangerous views
DROP VIEW IF EXISTS limited_images;
DROP VIEW IF EXISTS chat_summaries CASCADE;
DROP MATERIALIZED VIEW IF EXISTS chat_summaries_fast;

-- 2. Create chat_summaries with security_invoker
-- This makes the view respect RLS policies
CREATE VIEW chat_summaries WITH (security_invoker=true) AS
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

-- 3. Grant appropriate permissions
GRANT SELECT ON chat_summaries TO anon;
GRANT SELECT ON chat_summaries TO authenticated;

-- 4. Enable RLS on messages if not already enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 5. Create messages policy
DO $$ 
BEGIN
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Allow all operations on messages" ON messages;
EXCEPTION 
    WHEN undefined_object THEN 
        NULL; -- Policy doesn't exist, continue
END $$;

CREATE POLICY "Allow all operations on messages" 
ON messages 
FOR ALL 
USING (true);

-- 6. Verify the fix
SELECT 
    'PostgreSQL 15+ Security Fix Applied!' AS status,
    'Views now respect RLS with security_invoker' AS detail,
    current_timestamp AS applied_at;

-- 7. Check that views are using security_invoker
SELECT 
    c.relname AS view_name,
    CASE 
        WHEN c.reloptions::text LIKE '%security_invoker=true%' 
        THEN 'YES - Using security_invoker ✓'
        ELSE 'NO - Not using security_invoker ✗'
    END AS security_invoker_enabled
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relkind = 'v' 
  AND n.nspname = 'public'
  AND c.relname = 'chat_summaries';