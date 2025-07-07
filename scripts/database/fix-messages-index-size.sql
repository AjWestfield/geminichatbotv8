-- Fix Messages Table Index Size Error
-- This script addresses the "index row requires 2362416 bytes, maximum size is 8191" error
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. IDENTIFY LARGE MESSAGES
-- ============================================
-- First, let's see how many messages have extremely large content
SELECT 
    COUNT(*) as total_large_messages,
    MAX(length(content)) as max_content_length,
    MIN(length(content)) as min_large_content_length
FROM public.messages
WHERE length(content) > 100000; -- Messages over 100KB

-- ============================================
-- 2. DROP PROBLEMATIC INDEXES
-- ============================================
-- Drop any existing indexes that might include the content column
DROP INDEX IF EXISTS idx_messages_chat_created;
DROP INDEX IF EXISTS idx_messages_search;
DROP INDEX IF EXISTS idx_messages_recent_active;

-- ============================================
-- 3. CREATE OPTIMIZED INDEXES WITHOUT CONTENT
-- ============================================
-- Create indexes that exclude the large content column

-- Index for chat queries (without content)
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created 
ON public.messages(chat_id, created_at DESC)
WHERE chat_id IS NOT NULL;

-- Index for recent messages (without content)
CREATE INDEX IF NOT EXISTS idx_messages_created_at_desc 
ON public.messages(created_at DESC);

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_messages_role 
ON public.messages(role)
WHERE role IS NOT NULL;

-- Composite index for chat listing
CREATE INDEX IF NOT EXISTS idx_messages_chat_role_created 
ON public.messages(chat_id, role, created_at DESC)
WHERE chat_id IS NOT NULL;

-- ============================================
-- 4. CREATE TEXT SEARCH INDEX (GIN)
-- ============================================
-- For content searching, use GIN index which handles large text better
-- Only create if you need full-text search

-- First, add a text search column if needed
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'content_tsv'
    ) THEN
        ALTER TABLE public.messages 
        ADD COLUMN content_tsv tsvector;
    END IF;
END $$;

-- Create a function to generate tsvector from content (with size limit)
CREATE OR REPLACE FUNCTION messages_content_tsv_trigger() RETURNS trigger AS $$
BEGIN
    -- Only index first 1MB of content to avoid size issues
    NEW.content_tsv := to_tsvector('english', 
        CASE 
            WHEN length(NEW.content) > 1048576 THEN 
                substring(NEW.content, 1, 1048576)
            ELSE 
                NEW.content 
        END
    );
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create trigger for new/updated messages
DROP TRIGGER IF EXISTS messages_content_tsv_update ON public.messages;
CREATE TRIGGER messages_content_tsv_update 
    BEFORE INSERT OR UPDATE OF content ON public.messages
    FOR EACH ROW 
    EXECUTE FUNCTION messages_content_tsv_trigger();

-- Update existing messages (in batches to avoid timeout)
-- This updates only NULL tsv values to avoid re-processing
UPDATE public.messages 
SET content_tsv = to_tsvector('english', 
    CASE 
        WHEN length(content) > 1048576 THEN 
            substring(content, 1, 1048576)
        ELSE 
            content 
    END
)
WHERE content_tsv IS NULL
AND created_at > NOW() - INTERVAL '30 days'; -- Only recent messages

-- Create GIN index for text search
CREATE INDEX IF NOT EXISTS idx_messages_content_search 
ON public.messages USING gin(content_tsv);

-- ============================================
-- 5. CREATE PARTIAL INDEXES FOR COMMON QUERIES
-- ============================================

-- Index for user messages only
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
-- 6. OPTIMIZE EXISTING DATA
-- ============================================

-- Create a summary of large messages for review
CREATE TABLE IF NOT EXISTS public.large_messages_summary (
    message_id UUID PRIMARY KEY,
    chat_id UUID,
    content_length INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    role TEXT,
    summary TEXT
);

-- Populate summary table with large messages
INSERT INTO public.large_messages_summary (message_id, chat_id, content_length, created_at, role, summary)
SELECT 
    id,
    chat_id,
    length(content),
    created_at,
    role,
    CASE 
        WHEN length(content) > 1000 THEN 
            substring(content, 1, 1000) || '... [truncated]'
        ELSE 
            content
    END as summary
FROM public.messages
WHERE length(content) > 500000 -- Messages over 500KB
ON CONFLICT (message_id) DO NOTHING;

-- ============================================
-- 7. ADD CONTENT SIZE CONSTRAINT (OPTIONAL)
-- ============================================
-- Uncomment to prevent future large messages
-- ALTER TABLE public.messages 
-- ADD CONSTRAINT check_content_size 
-- CHECK (length(content) <= 1048576); -- 1MB limit

-- ============================================
-- 8. VACUUM AND ANALYZE
-- ============================================
-- Optimize table performance after index changes
VACUUM ANALYZE public.messages;

-- ============================================
-- 9. VERIFY INDEXES
-- ============================================
-- Check that all indexes were created successfully
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'messages'
ORDER BY indexname;

-- Check table size and index sizes
SELECT 
    pg_size_pretty(pg_total_relation_size('public.messages')) as total_size,
    pg_size_pretty(pg_relation_size('public.messages')) as table_size,
    pg_size_pretty(pg_total_relation_size('public.messages') - pg_relation_size('public.messages')) as indexes_size;

-- ============================================
-- 10. FINAL STATUS
-- ============================================
SELECT 
    'Index optimization complete!' as status,
    COUNT(*) as total_messages,
    COUNT(CASE WHEN length(content) > 100000 THEN 1 END) as large_messages,
    COUNT(CASE WHEN length(content) > 500000 THEN 1 END) as very_large_messages,
    COUNT(CASE WHEN length(content) > 1000000 THEN 1 END) as huge_messages
FROM public.messages;