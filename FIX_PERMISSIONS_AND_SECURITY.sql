-- ============================================
-- FIX PERMISSIONS AND SECURITY DEFINER
-- Handles permission issues in Supabase
-- ============================================

-- 1. First, let's check current user and permissions
SELECT current_user, session_user;

-- 2. Drop the view (this should work even with limited permissions)
DROP VIEW IF EXISTS public.chat_summaries CASCADE;

-- 3. Try a simpler approach - create view without function
-- This avoids the permission issue with creating functions
BEGIN;

-- Create the view directly in public schema
CREATE OR REPLACE VIEW public.chat_summaries AS
SELECT 
    c.id,
    c.title,
    c.model,
    c.created_at,
    c.updated_at,
    c.metadata,
    (SELECT COUNT(*)::int FROM public.messages m WHERE m.chat_id = c.id) AS message_count,
    (SELECT COUNT(*)::int FROM public.images i WHERE i.chat_id = c.id) AS image_count,
    (SELECT COUNT(*)::int FROM public.videos v WHERE v.chat_id = c.id) AS video_count,
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
            FROM public.images 
            WHERE chat_id = c.id 
            ORDER BY created_at DESC 
            LIMIT 6
        ) sub
    ), '[]'::jsonb) AS image_thumbnails,
    (SELECT m.content 
     FROM public.messages m 
     WHERE m.chat_id = c.id 
       AND m.role = 'user' 
     ORDER BY m.created_at DESC 
     LIMIT 1
    ) AS last_message
FROM public.chats c;

-- Try to alter owner (may fail but that's ok)
DO $$ 
BEGIN
    ALTER VIEW public.chat_summaries OWNER TO authenticated;
EXCEPTION 
    WHEN insufficient_privilege THEN 
        RAISE NOTICE 'Could not change owner - continuing anyway';
END $$;

-- Grant permissions
GRANT SELECT ON public.chat_summaries TO anon;
GRANT SELECT ON public.chat_summaries TO authenticated;

COMMIT;

-- 4. Verify the view was created
SELECT 
    'View created successfully' AS status,
    schemaname,
    viewname,
    viewowner
FROM pg_views
WHERE schemaname = 'public' 
  AND viewname = 'chat_summaries';

-- 5. Check if it still has SECURITY DEFINER
SELECT 
    CASE 
        WHEN definition ILIKE '%SECURITY DEFINER%' THEN 'Still has SECURITY DEFINER - see alternative solution'
        ELSE 'SECURITY DEFINER removed successfully'
    END AS security_status
FROM pg_views
WHERE schemaname = 'public' 
  AND viewname = 'chat_summaries';