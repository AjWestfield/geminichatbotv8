-- ============================================
-- NO FUNCTIONS - JUST RECREATE THE VIEW
-- Avoids all permission issues
-- ============================================

-- Simple transaction to ensure consistency
BEGIN;

-- 1. Drop existing view
DROP VIEW IF EXISTS public.chat_summaries;

-- 2. Create new view with all required columns
-- No functions, no complex permissions needed
CREATE VIEW public.chat_summaries AS
SELECT 
    c.id,
    c.title,
    c.model,
    c.created_at,
    c.updated_at,
    c.metadata,
    (SELECT COUNT(*) FROM messages WHERE chat_id = c.id AND role = 'user')::int AS message_count,
    (SELECT COUNT(*) FROM images WHERE chat_id = c.id)::int AS image_count,
    (SELECT COUNT(*) FROM videos WHERE chat_id = c.id)::int AS video_count,
    (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', i.id,
                'url', i.url,
                'prompt', i.prompt,
                'is_uploaded', i.is_uploaded,
                'model', i.model
            ) ORDER BY i.created_at DESC
        ), '[]'::jsonb)
        FROM (
            SELECT id, url, prompt, is_uploaded, model, created_at
            FROM images
            WHERE chat_id = c.id
            ORDER BY created_at DESC
            LIMIT 6
        ) i
    ) AS image_thumbnails,
    (
        SELECT content 
        FROM messages 
        WHERE chat_id = c.id AND role = 'user' 
        ORDER BY created_at DESC 
        LIMIT 1
    ) AS last_message
FROM chats c;

-- 3. Grant permissions
GRANT SELECT ON public.chat_summaries TO authenticated;
GRANT SELECT ON public.chat_summaries TO anon;

COMMIT;

-- 4. Success message
SELECT 'View recreated successfully without any functions!' AS result;