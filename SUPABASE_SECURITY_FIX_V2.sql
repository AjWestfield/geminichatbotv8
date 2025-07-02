-- ============================================
-- SUPABASE SPECIFIC SECURITY FIX
-- Works within Supabase's permission constraints
-- ============================================

-- Option 1: If you're on PostgreSQL 15+, this should work
DO $$
BEGIN
    -- Drop the problematic view
    DROP VIEW IF EXISTS public.chat_summaries CASCADE;
    
    -- Try to create with security_invoker (PG 15+ only)
    BEGIN
        EXECUTE '
        CREATE VIEW public.chat_summaries WITH (security_invoker = on) AS
        SELECT 
            c.*,
            (SELECT COUNT(*) FROM messages WHERE chat_id = c.id)::int AS message_count,
            (SELECT COUNT(*) FROM images WHERE chat_id = c.id)::int AS image_count,
            (SELECT COUNT(*) FROM videos WHERE chat_id = c.id)::int AS video_count,
            ''[]''::jsonb AS image_thumbnails,
            ''''::text AS last_message
        FROM chats c';
        
        RAISE NOTICE 'Created view with security_invoker (PG 15+)';
    EXCEPTION 
        WHEN OTHERS THEN
            -- If that fails, create without security_invoker
            EXECUTE '
            CREATE VIEW public.chat_summaries AS
            SELECT 
                c.*,
                (SELECT COUNT(*) FROM messages WHERE chat_id = c.id)::int AS message_count,
                (SELECT COUNT(*) FROM images WHERE chat_id = c.id)::int AS image_count,
                (SELECT COUNT(*) FROM videos WHERE chat_id = c.id)::int AS video_count,
                ''[]''::jsonb AS image_thumbnails,
                ''''::text AS last_message
            FROM chats c';
            
            RAISE NOTICE 'Created view without security_invoker (PG < 15)';
    END;
END $$;

-- Grant permissions
GRANT SELECT ON public.chat_summaries TO anon;
GRANT SELECT ON public.chat_summaries TO authenticated;

-- Check result
SELECT 'SUPABASE FIX APPLIED' AS status;