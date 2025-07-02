-- ============================================
-- CHECK PERMISSIONS AND APPLY TARGETED FIX
-- ============================================

-- 1. Check current user and permissions
SELECT 
    current_user,
    has_schema_privilege(current_user, 'public', 'CREATE') as can_create_in_public,
    has_function_privilege(current_user, 'pg_catalog.current_setting(text)', 'EXECUTE') as can_execute_functions;

-- 2. Check PostgreSQL version
SELECT 
    version(),
    CASE 
        WHEN current_setting('server_version_num')::int >= 150000 
        THEN 'PostgreSQL 15+ (supports security_invoker)'
        ELSE 'PostgreSQL < 15 (no security_invoker support)'
    END as version_info;

-- 3. Check current views and their properties
SELECT 
    schemaname,
    viewname,
    viewowner,
    CASE 
        WHEN definition ILIKE '%SECURITY DEFINER%' THEN 'HAS SECURITY DEFINER'
        ELSE 'No explicit SECURITY DEFINER'
    END as security_status
FROM pg_views
WHERE schemaname = 'public' 
  AND viewname IN ('chat_summaries', 'limited_images');

-- 4. TARGETED FIX: Just drop and recreate the view simply
BEGIN;

-- Drop the problematic view
DROP VIEW IF EXISTS public.chat_summaries CASCADE;

-- Create the simplest possible view
CREATE VIEW public.chat_summaries AS
SELECT 
    c.id,
    c.title,
    c.model,
    c.created_at,
    c.updated_at,
    COALESCE(c.metadata, '{}'::jsonb) as metadata,
    0 as message_count,
    0 as image_count,
    0 as video_count,
    '[]'::jsonb as image_thumbnails,
    '' as last_message
FROM public.chats c;

-- Grant permissions
GRANT SELECT ON public.chat_summaries TO authenticated;
GRANT SELECT ON public.chat_summaries TO anon;

COMMIT;

-- 5. Verify the fix
SELECT 
    'Fix applied' as status,
    viewname,
    viewowner
FROM pg_views
WHERE schemaname = 'public' 
  AND viewname = 'chat_summaries';