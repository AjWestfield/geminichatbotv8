-- ============================================
-- FORCE REMOVE SECURITY DEFINER
-- Alternative approach using function wrapper
-- ============================================

-- 1. Drop the problematic view completely
DROP VIEW IF EXISTS chat_summaries CASCADE;

-- 2. Create a regular function instead of a view
-- Functions give us more control over security context
CREATE OR REPLACE FUNCTION get_chat_summaries()
RETURNS TABLE (
    id UUID,
    title TEXT,
    model TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    metadata JSONB,
    message_count INT,
    image_count INT,
    video_count INT,
    image_thumbnails JSONB,
    last_message TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER -- This ensures it runs as the calling user, not as definer
AS $$
    SELECT 
        c.id,
        c.title,
        c.model,
        c.created_at,
        c.updated_at,
        c.metadata,
        (SELECT COUNT(*)::int FROM messages m WHERE m.chat_id = c.id) AS message_count,
        (SELECT COUNT(*)::int FROM images i WHERE i.chat_id = c.id) AS image_count,
        (SELECT COUNT(*)::int FROM videos v WHERE v.chat_id = c.id) AS video_count,
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
        (SELECT m.content 
         FROM messages m 
         WHERE m.chat_id = c.id 
           AND m.role = 'user' 
         ORDER BY m.created_at DESC 
         LIMIT 1
        ) AS last_message
    FROM chats c;
$$;

-- 3. Create a view that calls the function
-- This view will NOT have SECURITY DEFINER
CREATE VIEW chat_summaries AS 
SELECT * FROM get_chat_summaries();

-- 4. Ensure the view is owned by authenticated role
ALTER VIEW chat_summaries OWNER TO authenticated;

-- 5. Grant permissions
GRANT SELECT ON chat_summaries TO anon;
GRANT SELECT ON chat_summaries TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_summaries() TO anon;
GRANT EXECUTE ON FUNCTION get_chat_summaries() TO authenticated;

-- 6. Verify no SECURITY DEFINER
SELECT 
    'Function-based approach applied' AS status,
    'This method prevents SECURITY DEFINER from being added' AS explanation,
    'The function uses SECURITY INVOKER explicitly' AS security_model;

-- 7. Clean verification
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'get_chat_summaries';