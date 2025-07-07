-- Run VACUUM Commands Separately
-- VACUUM cannot run inside a transaction, so run these one by one

-- Run each of these commands SEPARATELY in Supabase SQL Editor:

-- 1. First, check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 2. Run this SEPARATELY (not in a transaction):
VACUUM ANALYZE public.messages;

-- 3. Run this SEPARATELY:
VACUUM ANALYZE public.chats;

-- 4. Run this SEPARATELY:
VACUUM ANALYZE public.images;

-- 5. Run this SEPARATELY:
VACUUM ANALYZE public.videos;

-- 6. Check results
SELECT 
    tablename,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    n_dead_tup as dead_rows_remaining
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND tablename IN ('messages', 'chats', 'images', 'videos')
ORDER BY tablename;