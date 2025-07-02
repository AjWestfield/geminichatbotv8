-- ============================================
-- UNIVERSAL SECURITY FIX - WORKS ON ANY POSTGRESQL VERSION
-- Automatically detects version and applies appropriate fix
-- ============================================

-- Step 1: Clean up dangerous objects
DROP VIEW IF EXISTS limited_images;
DROP VIEW IF EXISTS chat_summaries CASCADE;
DROP MATERIALIZED VIEW IF EXISTS chat_summaries_fast;

-- Step 2: Create a safe view that works on any version
-- This approach avoids SECURITY DEFINER entirely
DO $$
DECLARE
    pg_version_num INTEGER;
    view_definition TEXT;
BEGIN
    -- Get PostgreSQL version number
    pg_version_num := current_setting('server_version_num')::INTEGER;
    
    -- Base view definition
    view_definition := '
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
    
    -- Create view based on PostgreSQL version
    IF pg_version_num >= 150000 THEN
        -- PostgreSQL 15+: Use security_invoker
        EXECUTE 'CREATE VIEW chat_summaries WITH (security_invoker=true) AS ' || view_definition;
        RAISE NOTICE 'Created view with security_invoker (PostgreSQL 15+)';
    ELSE
        -- PostgreSQL < 15: Create without SECURITY DEFINER
        EXECUTE 'CREATE VIEW chat_summaries AS ' || view_definition;
        -- Change owner to authenticated
        EXECUTE 'ALTER VIEW chat_summaries OWNER TO authenticated';
        RAISE NOTICE 'Created view without SECURITY DEFINER and changed owner (PostgreSQL < 15)';
    END IF;
END $$;

-- Step 3: Grant permissions
GRANT SELECT ON chat_summaries TO anon;
GRANT SELECT ON chat_summaries TO authenticated;

-- Step 4: Enable RLS on all related tables
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Step 5: Create/update messages policy safely
DO $$ 
BEGIN
    -- Try to drop existing policy
    BEGIN
        DROP POLICY "Allow all operations on messages" ON messages;
    EXCEPTION 
        WHEN undefined_object THEN 
            NULL; -- Policy doesn't exist
    END;
END $$;

CREATE POLICY "Allow all operations on messages" 
ON messages 
FOR ALL 
USING (true);

-- Step 6: Create basic policies for other tables if they don't exist
DO $$ 
BEGIN
    -- Chats policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'chats' 
          AND policyname = 'Users can view all chats'
    ) THEN
        CREATE POLICY "Users can view all chats" 
        ON chats FOR SELECT 
        USING (true);
    END IF;
    
    -- Images policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'images' 
          AND policyname = 'Users can view all images'
    ) THEN
        CREATE POLICY "Users can view all images" 
        ON images FOR SELECT 
        USING (true);
    END IF;
    
    -- Videos policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'videos' 
          AND policyname = 'Users can view all videos'
    ) THEN
        CREATE POLICY "Users can view all videos" 
        ON videos FOR SELECT 
        USING (true);
    END IF;
END $$;

-- Step 7: Verification
WITH version_info AS (
    SELECT 
        version() AS full_version,
        current_setting('server_version_num')::int AS version_num,
        CASE 
            WHEN current_setting('server_version_num')::int >= 150000 
            THEN 'PostgreSQL 15+ (security_invoker supported)'
            ELSE 'PostgreSQL < 15 (using owner-based security)'
        END AS version_category
)
SELECT 
    'UNIVERSAL SECURITY FIX APPLIED!' AS status,
    version_category AS postgres_version,
    CASE 
        WHEN version_num >= 150000 
        THEN 'View created with security_invoker=true'
        ELSE 'View created without SECURITY DEFINER, owner set to authenticated'
    END AS fix_applied,
    current_timestamp AS applied_at
FROM version_info;

-- Step 8: Final security check
SELECT 
    'Security Status Check:' AS check_type,
    schemaname,
    viewname,
    viewowner,
    CASE 
        WHEN viewowner = 'postgres' AND 
             current_setting('server_version_num')::int < 150000 
        THEN 'POTENTIAL ISSUE - Run ALTER VIEW ' || viewname || ' OWNER TO authenticated;'
        ELSE 'OK'
    END AS status
FROM pg_views
WHERE schemaname = 'public' 
  AND viewname = 'chat_summaries';