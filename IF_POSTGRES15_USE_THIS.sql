-- ============================================
-- POSTGRESQL 15+ SECURITY FIX
-- Use this if your Supabase uses PostgreSQL 15+
-- ============================================

-- Drop the problematic view
DROP VIEW IF EXISTS public.chat_summaries CASCADE;

-- Create with security_invoker (PG 15+ feature)
-- This ensures the view respects Row Level Security
CREATE VIEW public.chat_summaries WITH (security_invoker = true) AS
SELECT 
    c.id,
    c.title,
    c.model,
    c.created_at,
    c.updated_at,
    c.metadata,
    (SELECT COUNT(*)::int FROM public.messages m WHERE m.chat_id = c.id AND m.role = 'user') AS message_count,
    (SELECT COUNT(*)::int FROM public.images i WHERE i.chat_id = c.id) AS image_count,
    (SELECT COUNT(*)::int FROM public.videos v WHERE v.chat_id = c.id) AS video_count,
    COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', img.id,
                'url', img.url,
                'prompt', img.prompt,
                'is_uploaded', img.is_uploaded,
                'model', img.model
            ) ORDER BY img.created_at DESC
        )
        FROM (
            SELECT i.id, i.url, i.prompt, i.is_uploaded, i.model, i.created_at
            FROM public.images i
            WHERE i.chat_id = c.id
            ORDER BY i.created_at DESC
            LIMIT 6
        ) img
    ), '[]'::jsonb) AS image_thumbnails,
    (SELECT m.content FROM public.messages m WHERE m.chat_id = c.id AND m.role = 'user' ORDER BY m.created_at DESC LIMIT 1) AS last_message
FROM public.chats c;

-- Grant permissions
GRANT SELECT ON public.chat_summaries TO anon;
GRANT SELECT ON public.chat_summaries TO authenticated;
GRANT SELECT ON public.chat_summaries TO service_role;

-- Verify
SELECT 'PostgreSQL 15+ fix with security_invoker applied!' AS status;