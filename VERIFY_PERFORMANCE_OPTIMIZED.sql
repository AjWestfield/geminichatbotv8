-- Verify Database Performance Optimization
-- Run this after CLEANUP_DUPLICATE_POLICIES.sql

-- 1. Check for multiple permissive policies (should be none)
WITH policy_counts AS (
    SELECT 
        tablename,
        cmd,
        COUNT(*) as policy_count,
        string_agg(policyname, ', ') as policies
    FROM pg_policies
    WHERE tablename = 'images'
        AND permissive = 'PERMISSIVE'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
)
SELECT 
    'Multiple Permissive Policies Check' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS ✓ - No duplicate policies'
        ELSE 'FAIL ✗ - Found ' || COUNT(*) || ' duplicate policy groups'
    END as status,
    COALESCE(jsonb_agg(row_to_json(policy_counts)), '[]'::jsonb) as details
FROM policy_counts;

-- 2. Check for duplicate indexes
WITH duplicate_indexes AS (
    SELECT 
        schemaname,
        tablename,
        COUNT(*) as index_count,
        string_agg(indexname, ', ') as duplicate_indexes
    FROM pg_indexes
    WHERE schemaname = 'public'
        AND tablename IN ('images', 'messages')
    GROUP BY schemaname, tablename, indexdef
    HAVING COUNT(*) > 1
)
SELECT 
    'Duplicate Indexes Check' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS ✓ - No duplicate indexes'
        ELSE 'FAIL ✗ - Found duplicate indexes'
    END as status,
    COALESCE(jsonb_agg(row_to_json(duplicate_indexes)), '[]'::jsonb) as details
FROM duplicate_indexes;

-- 3. List all current policies on images table
SELECT 
    'Current RLS Policies' as check_type,
    COUNT(*) || ' policies on images table' as status,
    jsonb_agg(jsonb_build_object(
        'policy', policyname,
        'command', cmd,
        'permissive', permissive
    )) as policies
FROM pg_policies
WHERE tablename = 'images';

-- 4. List all indexes on critical tables
SELECT 
    'Index Summary' as check_type,
    tablename,
    COUNT(*) as index_count,
    jsonb_agg(indexname ORDER BY indexname) as indexes
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('images', 'messages', 'chats')
GROUP BY tablename
ORDER BY tablename;

-- 5. Performance recommendations
SELECT 
    'Performance Status' as check_type,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'images' GROUP BY cmd HAVING COUNT(*) > 1 LIMIT 1) IS NULL
            AND (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' GROUP BY tablename, indexdef HAVING COUNT(*) > 1 LIMIT 1) IS NULL
        THEN 'OPTIMIZED ✓ - Database is properly optimized'
        ELSE 'NEEDS ATTENTION - Run CLEANUP_DUPLICATE_POLICIES.sql'
    END as status,
    jsonb_build_object(
        'total_policies', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'images'),
        'total_indexes', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('images', 'messages')),
        'images_row_count', (SELECT COUNT(*) FROM images)
    ) as metrics;

-- 6. Test query performance (simple image fetch)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM images 
WHERE chat_id IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 10;