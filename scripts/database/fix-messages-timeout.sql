-- Fix Messages Table Timeout Issues
-- Run this after the emergency index fix

-- 1. Check for active locks on messages table
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    query_start,
    state,
    wait_event_type,
    wait_event,
    LEFT(query, 100) as query_preview
FROM pg_stat_activity 
WHERE query ILIKE '%messages%' 
AND state != 'idle'
ORDER BY query_start;

-- 2. Kill any long-running queries on messages table (if needed)
-- Uncomment and modify PID as needed:
-- SELECT pg_terminate_backend(PID_HERE);

-- 3. Run VACUUM ANALYZE to clean up and update statistics
VACUUM ANALYZE public.messages;

-- 4. Check table statistics
SELECT 
    schemaname,
    tablename,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables 
WHERE tablename = 'messages';

-- 5. Create a simpler check that won't timeout
DO $$ 
DECLARE
    msg_count INTEGER;
    large_count INTEGER;
BEGIN
    -- Count total messages (with timeout protection)
    BEGIN
        SELECT COUNT(*) INTO msg_count FROM public.messages;
        RAISE NOTICE 'Total messages: %', msg_count;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not count messages: %', SQLERRM;
    END;
    
    -- Count large messages
    BEGIN
        SELECT COUNT(*) INTO large_count 
        FROM public.messages 
        WHERE length(content) > 100000;
        RAISE NOTICE 'Large messages (>100KB): %', large_count;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not count large messages: %', SQLERRM;
    END;
END $$;

-- 6. Verify current indexes are working
SELECT 
    indexname,
    indexdef,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes 
WHERE tablename = 'messages'
AND schemaname = 'public'
ORDER BY indexname;