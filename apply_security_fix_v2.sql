-- ============================================
-- SECURITY FIX - V2
-- ============================================

-- Create roles if they don't exist
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
      CREATE ROLE anon;
   END IF;
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
      CREATE ROLE authenticated;
   END IF;
END
$$;

-- Drop problematic views
DROP VIEW IF EXISTS limited_images;
DROP VIEW IF EXISTS chat_summaries CASCADE;

-- Create chat_summaries view (WITHOUT any DEFINER clause)
CREATE VIEW chat_summaries AS
SELECT
    c.id,
    c.title,
    c.model,
    c.created_at,
    c.updated_at,
    c.metadata,
    c.untitled_count,
    (SELECT COUNT(*)::int FROM messages m WHERE m.chat_id = c.id) AS message_count,
    (SELECT COUNT(*)::int FROM images i WHERE i.chat_id = c.id) AS image_count,
    (SELECT COUNT(*)::int FROM videos v WHERE v.chat_id = c.id) AS video_count,
    COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
            'id', i.id,
            'url', i.url,
            'prompt', i.prompt,
            'is_uploaded', i.is_uploaded,
            'model', i.model
        ) ORDER BY i.created_at DESC)
        FROM (
            SELECT id, url, prompt, is_uploaded, model, created_at
            FROM images
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

-- Grant permissions
GRANT SELECT ON chat_summaries TO anon;
GRANT SELECT ON chat_summaries TO authenticated;

-- Drop materialized view
DROP MATERIALIZED VIEW IF EXISTS chat_summaries_fast;

-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Handle messages policy
DO $$
BEGIN
    -- Try to drop existing policy
    EXECUTE 'DROP POLICY IF EXISTS "Allow all operations on messages" ON messages';
EXCEPTION
    WHEN undefined_object THEN
        -- Policy doesn't exist, that's fine
        NULL;
END $$;

-- Create new policy
CREATE POLICY "Allow all operations on messages"
    ON messages
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Success message
SELECT 'Security fixes applied!' AS status;