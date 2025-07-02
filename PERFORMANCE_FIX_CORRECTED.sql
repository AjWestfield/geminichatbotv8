-- Fix All Performance Issues - Corrected Version
-- This resolves all Supabase linter warnings

-- Show initial state
SELECT 'INITIAL STATE' as phase, 
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'images') as image_policies,
    (SELECT COUNT(DISTINCT indexname) FROM pg_indexes WHERE tablename = 'images' AND indexname LIKE 'idx_%') as image_indexes;

-- STEP 1: Clean up duplicate RLS policies
-- Drop all the old individual policies
DROP POLICY IF EXISTS "Enable all access for all users" ON images;
DROP POLICY IF EXISTS "Enable read access for all users" ON images;
DROP POLICY IF EXISTS "Enable insert access for all users" ON images;
DROP POLICY IF EXISTS "Enable update access for all users" ON images;
DROP POLICY IF EXISTS "Enable delete access for all users" ON images;

-- The "Allow all operations on images" policy will remain

-- STEP 2: Clean up duplicate indexes
-- Fix duplicate indexes on images table
DROP INDEX IF EXISTS idx_images_created_desc;

-- Fix duplicate indexes on messages table  
DROP INDEX IF EXISTS idx_messages_optimized;

-- STEP 3: Verify the cleanup
-- Check final policy count (should be 1)
SELECT 'AFTER CLEANUP - Policies' as check_type,
    tablename,
    COUNT(*) as policy_count,
    string_agg(policyname, ', ') as policies
FROM pg_policies
WHERE tablename = 'images'
GROUP BY tablename;

-- Check for any remaining duplicate indexes (should be 0)
WITH dup_check AS (
    SELECT 
        tablename,
        indexdef,
        COUNT(*) as dup_count,
        string_agg(indexname, ', ') as index_names
    FROM pg_indexes
    WHERE schemaname = 'public'
        AND tablename IN ('images', 'messages')
    GROUP BY tablename, indexdef
    HAVING COUNT(*) > 1
)
SELECT 
    'AFTER CLEANUP - Duplicate Indexes' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN 'SUCCESS - No duplicate indexes found'
        ELSE 'FAILED - Still have duplicates'
    END as status,
    COUNT(*) as duplicate_groups
FROM dup_check;

-- STEP 4: Final summary
SELECT 
    'PERFORMANCE OPTIMIZATION COMPLETE' as status,
    jsonb_pretty(jsonb_build_object(
        'images_table', jsonb_build_object(
            'policies', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'images'),
            'policy_names', (SELECT string_agg(policyname, ', ') FROM pg_policies WHERE tablename = 'images'),
            'indexes', (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'images' AND indexname LIKE 'idx_%')
        ),
        'messages_table', jsonb_build_object(
            'indexes', (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'messages' AND indexname LIKE 'idx_%')
        ),
        'optimization_status', CASE
            WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'images') = 1
                AND NOT EXISTS (
                    SELECT 1 FROM pg_indexes 
                    WHERE schemaname = 'public' 
                    GROUP BY tablename, indexdef 
                    HAVING COUNT(*) > 1
                )
            THEN 'FULLY OPTIMIZED'
            ELSE 'NEEDS ATTENTION'
        END
    )) as summary;

-- Show all remaining indexes for reference
SELECT 
    'Remaining Indexes' as section,
    tablename,
    indexname,
    substring(indexdef, 1, 80) || '...' as index_definition
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('images', 'messages', 'chats')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;