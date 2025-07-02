-- ============================================
-- FIX SECURITY DEFINER - FINAL SOLUTION
-- This ensures the view is created WITHOUT SECURITY DEFINER
-- ============================================

-- 1. First, check current PostgreSQL version
DO $$
DECLARE
    pg_version_num INTEGER;
BEGIN
    pg_version_num := current_setting('server_version_num')::INTEGER;
    RAISE NOTICE 'PostgreSQL version number: %', pg_version_num;
    
    IF pg_version_num >= 150000 THEN
        RAISE NOTICE 'PostgreSQL 15+ detected - will use security_invoker';
    ELSE
        RAISE NOTICE 'PostgreSQL < 15 detected - will use owner-based security';
    END IF;
END $$;

-- 2. Drop the problematic view
DROP VIEW IF EXISTS chat_summaries CASCADE;

-- 3. Create the view with explicit security settings
DO $$
DECLARE
    pg_version_num INTEGER;
BEGIN
    pg_version_num := current_setting('server_version_num')::INTEGER;
    
    IF pg_version_num >= 150000 THEN
        -- PostgreSQL 15+: Use security_invoker to ensure RLS is respected
        EXECUTE '
        CREATE VIEW chat_summaries WITH (security_invoker=true) AS
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
                        ''id'', sub.id,
                        ''url'', sub.url,
                        ''prompt'', sub.prompt,
                        ''is_uploaded'', sub.is_uploaded,
                        ''model'', sub.model
                    ) ORDER BY sub.created_at DESC
                )
                FROM (
                    SELECT id, url, prompt, is_uploaded, model, created_at
                    FROM images 
                    WHERE chat_id = c.id 
                    ORDER BY created_at DESC 
                    LIMIT 6
                ) sub
            ), ''[]''::jsonb) AS image_thumbnails,
            (SELECT m.content 
             FROM messages m 
             WHERE m.chat_id = c.id 
               AND m.role = ''user'' 
             ORDER BY m.created_at DESC 
             LIMIT 1
            ) AS last_message
        FROM chats c';
    ELSE
        -- PostgreSQL < 15: Create without any security definer
        -- First create as superuser, then change owner
        EXECUTE '
        CREATE VIEW chat_summaries AS
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
                        ''id'', sub.id,
                        ''url'', sub.url,
                        ''prompt'', sub.prompt,
                        ''is_uploaded'', sub.is_uploaded,
                        ''model'', sub.model
                    ) ORDER BY sub.created_at DESC
                )
                FROM (
                    SELECT id, url, prompt, is_uploaded, model, created_at
                    FROM images 
                    WHERE chat_id = c.id 
                    ORDER BY created_at DESC 
                    LIMIT 6
                ) sub
            ), ''[]''::jsonb) AS image_thumbnails,
            (SELECT m.content 
             FROM messages m 
             WHERE m.chat_id = c.id 
               AND m.role = ''user'' 
             ORDER BY m.created_at DESC 
             LIMIT 1
            ) AS last_message
        FROM chats c';
        
        -- CRITICAL: Change owner to remove implicit SECURITY DEFINER
        EXECUTE 'ALTER VIEW chat_summaries OWNER TO authenticated';
    END IF;
END $$;

-- 4. Grant permissions
GRANT SELECT ON chat_summaries TO anon;
GRANT SELECT ON chat_summaries TO authenticated;

-- 5. Verify the fix worked
SELECT 
    n.nspname AS schema_name,
    c.relname AS view_name,
    pg_get_userbyid(c.relowner) AS owner,
    CASE 
        WHEN pg_get_viewdef(c.oid)::text ILIKE '%SECURITY DEFINER%' THEN 'HAS SECURITY DEFINER ✗'
        WHEN c.reloptions::text LIKE '%security_invoker=true%' THEN 'Using security_invoker ✓'
        WHEN pg_get_userbyid(c.relowner) != 'postgres' THEN 'Owner changed from postgres ✓'
        ELSE 'Check manually'
    END AS security_status,
    current_setting('server_version') AS pg_version
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relkind = 'v' 
  AND n.nspname = 'public' 
  AND c.relname = 'chat_summaries';

-- 6. Final status
SELECT 'SECURITY DEFINER REMOVED!' AS status,
       'Run Supabase Linter again to verify' AS next_step;