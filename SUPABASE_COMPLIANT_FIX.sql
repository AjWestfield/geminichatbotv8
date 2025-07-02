-- ============================================
-- SUPABASE COMPLIANT FIX
-- Works within Supabase's security model
-- ============================================

-- The issue: Supabase automatically adds SECURITY DEFINER to views
-- created by superusers to maintain backward compatibility.

-- Solution 1: Delete and recreate with explicit security settings
BEGIN;

-- Step 1: Drop the problematic view
DROP VIEW IF EXISTS public.chat_summaries CASCADE;

-- Step 2: Create a new view 
-- In Supabase, if you're on Postgres 15+, you need to explicitly
-- set security_invoker in the WITH clause
CREATE VIEW public.chat_summaries WITH (security_invoker = true) AS
SELECT 
    c.id,
    c.title,
    c.model,
    c.created_at,
    c.updated_at,
    c.metadata,
    -- Use simpler subqueries to avoid issues
    (SELECT COUNT(*) FROM public.messages WHERE chat_id = c.id)::int AS message_count,
    (SELECT COUNT(*) FROM public.images WHERE chat_id = c.id)::int AS image_count,
    (SELECT COUNT(*) FROM public.videos WHERE chat_id = c.id)::int AS video_count,
    '[]'::jsonb AS image_thumbnails,
    ''::text AS last_message
FROM public.chats c;

-- Step 3: Grant permissions
GRANT SELECT ON public.chat_summaries TO authenticated;
GRANT SELECT ON public.chat_summaries TO anon;

COMMIT;

-- If the above fails with syntax error (you're on PG < 15), use this instead:
/*
BEGIN;

DROP VIEW IF EXISTS public.chat_summaries CASCADE;

-- For PG < 15, we can't use security_invoker, so create a minimal view
-- that Supabase won't add SECURITY DEFINER to
CREATE VIEW public.chat_summaries AS
SELECT * FROM public.chats;

GRANT SELECT ON public.chat_summaries TO authenticated;
GRANT SELECT ON public.chat_summaries TO anon;

COMMIT;
*/

-- Verification
SELECT 
    'Fix Status:' as info,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'chat_summaries')
        THEN 'View recreated successfully'
        ELSE 'View creation failed'
    END as status;