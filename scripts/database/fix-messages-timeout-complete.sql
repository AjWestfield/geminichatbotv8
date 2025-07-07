-- Fix Messages Table Timeout - Complete Solution
-- This script optimizes the messages table to prevent timeouts
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. IDENTIFY LARGE MESSAGES (Quick Check)
-- ============================================
-- First, let's see how many messages have extremely large content
SELECT 
    COUNT(*) as total_large_messages,
    MAX(length(content)) as max_content_length,
    pg_size_pretty(MAX(length(content))::bigint) as max_size_human
FROM public.messages
WHERE length(content) > 100000 -- Messages over 100KB
LIMIT 1; -- Limit to prevent timeout

-- ============================================
-- 2. DROP PROBLEMATIC INDEXES
-- ============================================
-- Drop any existing indexes that might include the content column
DROP INDEX IF EXISTS idx_messages_chat_created;
DROP INDEX IF EXISTS idx_messages_search;
DROP INDEX IF EXISTS idx_messages_recent_active;
DROP INDEX IF EXISTS idx_messages_chat_id; -- Also drop simple indexes we'll recreate
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_chat_created;

-- ============================================
-- 3. CREATE OPTIMIZED INDEXES WITHOUT CONTENT
-- ============================================
-- Create highly optimized indexes for common queries

-- Primary index for chat-based queries
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created 
ON public.messages(chat_id, created_at DESC)
WHERE chat_id IS NOT NULL;

-- Index for listing recent messages
CREATE INDEX IF NOT EXISTS idx_messages_created_at_desc 
ON public.messages(created_at DESC);

-- Index for role filtering
CREATE INDEX IF NOT EXISTS idx_messages_role 
ON public.messages(role)
WHERE role IS NOT NULL;

-- Composite index for efficient chat queries
CREATE INDEX IF NOT EXISTS idx_messages_chat_role_created 
ON public.messages(chat_id, role, created_at DESC)
WHERE chat_id IS NOT NULL;

-- ============================================
-- 4. CREATE PARTIAL INDEXES FOR COMMON QUERIES
-- ============================================

-- Index for user messages only (most common query)
CREATE INDEX IF NOT EXISTS idx_messages_user_recent 
ON public.messages(chat_id, created_at DESC)
WHERE role = 'user' AND chat_id IS NOT NULL;

-- Index for assistant messages only
CREATE INDEX IF NOT EXISTS idx_messages_assistant_recent 
ON public.messages(chat_id, created_at DESC)
WHERE role = 'assistant' AND chat_id IS NOT NULL;

-- Index for messages with attachments
CREATE INDEX IF NOT EXISTS idx_messages_with_attachments 
ON public.messages(chat_id, created_at DESC)
WHERE attachments IS NOT NULL AND jsonb_array_length(attachments) > 0;

-- ============================================
-- 5. CREATE SUMMARY TABLE FOR LARGE MESSAGES
-- ============================================

-- Create a summary of large messages for monitoring
CREATE TABLE IF NOT EXISTS public.large_messages_summary (
    message_id UUID PRIMARY KEY,
    chat_id UUID,
    content_length INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    role TEXT,
    summary TEXT
);

-- Populate with largest messages (limited to prevent timeout)
INSERT INTO public.large_messages_summary (message_id, chat_id, content_length, created_at, role, summary)
SELECT 
    id,
    chat_id,
    length(content),
    created_at,
    role,
    substring(content, 1, 200) || '... [truncated]' as summary
FROM public.messages
WHERE length(content) > 500000 -- Only very large messages
ORDER BY length(content) DESC
LIMIT 10
ON CONFLICT (message_id) DO NOTHING;

-- ============================================
-- 6. UPDATE TABLE STATISTICS
-- ============================================
-- Analyze the table to update query planner statistics
ANALYZE public.messages;

-- ============================================
-- 7. VERIFY INDEXES
-- ============================================
-- Check that all indexes were created successfully
SELECT 
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE tablename = 'messages'
AND schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- ============================================
-- 8. CHECK FINAL STATUS
-- ============================================
-- Quick status check (limited to prevent timeout)
WITH stats AS (
    SELECT 
        COUNT(*) as total_messages,
        MAX(length(content)) as max_size
    FROM public.messages
    WHERE created_at > NOW() - INTERVAL '7 days' -- Recent messages only
)
SELECT 
    'Optimization complete!' as status,
    total_messages as recent_messages_7d,
    pg_size_pretty(max_size::bigint) as largest_recent_message
FROM stats;

-- ============================================
-- NEXT STEPS (Run Separately)
-- ============================================
-- After this script completes, run these commands SEPARATELY:
-- 1. VACUUM ANALYZE public.messages;
-- 2. Test with: npm run db:check