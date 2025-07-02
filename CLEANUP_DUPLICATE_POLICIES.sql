-- Cleanup Duplicate RLS Policies and Indexes
-- This fixes the performance warnings from Supabase linter

-- 1. First, show current policies on images table
SELECT 
    'Current Policies on Images Table' as section,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'images'
ORDER BY policyname;

-- 2. Drop the duplicate/old policies
DROP POLICY IF EXISTS "Enable all access for all users" ON images;
DROP POLICY IF EXISTS "Enable read access for all users" ON images;
DROP POLICY IF EXISTS "Enable insert access for all users" ON images;
DROP POLICY IF EXISTS "Enable update access for all users" ON images;
DROP POLICY IF EXISTS "Enable delete access for all users" ON images;

-- Keep only the single comprehensive policy
-- (The "Allow all operations on images" policy already exists from our fix script)

-- 3. Verify only one policy remains
SELECT 
    'Policies After Cleanup' as section,
    COUNT(*) as policy_count,
    string_agg(policyname, ', ') as remaining_policies
FROM pg_policies 
WHERE tablename = 'images';

-- 4. Fix duplicate indexes on images table
-- Show current indexes
SELECT 
    'Current Indexes on Images' as section,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'images'
    AND indexname IN ('idx_images_created_at', 'idx_images_created_desc')
ORDER BY indexname;

-- Drop the duplicate index (keep the more descriptive one)
DROP INDEX IF EXISTS idx_images_created_desc;

-- 5. Fix duplicate indexes on messages table
-- Show current indexes
SELECT 
    'Current Indexes on Messages' as section,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'messages'
    AND indexname IN ('idx_messages_chat_id_created_at', 'idx_messages_optimized')
ORDER BY indexname;

-- Drop the duplicate index (keep the more specific one)
DROP INDEX IF EXISTS idx_messages_optimized;

-- 6. Verify final state
SELECT 
    'CLEANUP COMPLETE' as status,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'images') as image_policies,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'images' AND indexname LIKE 'idx_images_created%') as image_created_indexes,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'messages' AND indexname LIKE 'idx_messages%') as message_indexes;

-- 7. Show remaining policies and indexes for verification
SELECT 
    'Final Policies on Images' as section,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'images';

SELECT 
    'Final Indexes' as section,
    tablename,
    indexname
FROM pg_indexes
WHERE tablename IN ('images', 'messages')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;