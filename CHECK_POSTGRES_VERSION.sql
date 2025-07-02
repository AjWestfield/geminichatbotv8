-- ============================================
-- DIAGNOSTIC CHECK - PostgreSQL Version & Table Structure
-- Run this FIRST to determine which fix to use
-- ============================================

-- 1. Check PostgreSQL Version
SELECT version() AS postgres_version;

-- 2. Check if security_invoker is supported (PG 15+)
SELECT 
    CASE 
        WHEN current_setting('server_version_num')::int >= 150000 
        THEN 'PostgreSQL 15+ - security_invoker IS SUPPORTED ✓'
        ELSE 'PostgreSQL < 15 - security_invoker NOT supported ✗'
    END AS security_invoker_support;

-- 3. Show exact columns in chats table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'chats'
ORDER BY ordinal_position;

-- 4. Check existing views and their definitions
SELECT 
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views
WHERE schemaname = 'public' 
  AND viewname IN ('chat_summaries', 'limited_images');

-- 5. Check for materialized views
SELECT 
    schemaname,
    matviewname,
    matviewowner
FROM pg_matviews
WHERE schemaname = 'public';

-- 6. Check RLS status on tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('chats', 'messages', 'images', 'videos');

-- 7. List all policies on messages table
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'messages';

-- 8. Summary
SELECT 
    'Run this diagnostic first to determine:' AS instructions,
    '1. Your PostgreSQL version' AS step1,
    '2. Whether security_invoker is supported' AS step2,
    '3. Exact columns in your tables' AS step3,
    '4. Current view definitions' AS step4;