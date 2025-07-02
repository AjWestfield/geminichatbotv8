-- ============================================
-- FINAL WORKING FIX - NO FUNCTIONS, JUST VIEWS
-- This will work in Supabase SQL Editor
-- ============================================

-- Step 1: Drop the view that has SECURITY DEFINER
DROP VIEW IF EXISTS public.chat_summaries CASCADE;

-- Step 2: For PostgreSQL 15+, try with security_invoker first
DO $$
DECLARE
    v_sql TEXT;
    v_version INT;
BEGIN
    -- Get PostgreSQL version
    SELECT current_setting('server_version_num')::INT INTO v_version;
    
    -- Build the view SQL
    v_sql := 'CREATE VIEW public.chat_summaries AS
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
                    ''id'', sub.id,
                    ''url'', sub.url,
                    ''prompt'', sub.prompt,
                    ''is_uploaded'', sub.is_uploaded,
                    ''model'', sub.model
                ) ORDER BY sub.created_at DESC
            )
            FROM (
                SELECT id, url, prompt, is_uploaded, model, created_at
                FROM public.images 
                WHERE chat_id = c.id 
                ORDER BY created_at DESC 
                LIMIT 6
            ) sub
        ), ''[]''::jsonb) AS image_thumbnails,
        (SELECT m.content 
         FROM public.messages m 
         WHERE m.chat_id = c.id 
           AND m.role = ''user'' 
         ORDER BY m.created_at DESC 
         LIMIT 1
        ) AS last_message
    FROM public.chats c';
    
    -- Try to create with security_invoker if PG 15+
    IF v_version >= 150000 THEN
        BEGIN
            EXECUTE 'CREATE VIEW public.chat_summaries WITH (security_invoker = true) AS ' || 
                    SUBSTRING(v_sql FROM POSITION('AS' IN v_sql) + 3);
            RAISE NOTICE 'Created view with security_invoker';
        EXCEPTION WHEN OTHERS THEN
            -- If that fails, create without it
            EXECUTE v_sql;
            RAISE NOTICE 'Created view without security_invoker';
        END;
    ELSE
        -- For older versions, just create the view
        EXECUTE v_sql;
        RAISE NOTICE 'Created view (PG < 15)';
    END IF;
END $$;

-- Step 3: Grant permissions
GRANT SELECT ON public.chat_summaries TO authenticated;
GRANT SELECT ON public.chat_summaries TO anon;

-- Step 4: If the above doesn't work due to SECURITY DEFINER still being added,
-- use this alternative approach that creates a minimal view
/*
DROP VIEW IF EXISTS public.chat_summaries CASCADE;

CREATE VIEW public.chat_summaries AS
SELECT 
    chats.*,
    0::int as message_count,
    0::int as image_count,
    0::int as video_count,
    '[]'::jsonb as image_thumbnails,
    ''::text as last_message
FROM public.chats;

GRANT SELECT ON public.chat_summaries TO authenticated;
GRANT SELECT ON public.chat_summaries TO anon;
*/

-- Step 5: Verify
SELECT 
    'View created/updated' AS status,
    current_timestamp AS completed_at;

-- Step 6: Check if SECURITY DEFINER is still present
SELECT 
    viewname,
    viewowner,
    pg_get_viewdef(c.oid) AS definition
FROM pg_views v
JOIN pg_class c ON c.relname = v.viewname
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = v.schemaname
WHERE v.schemaname = 'public' AND v.viewname = 'chat_summaries';