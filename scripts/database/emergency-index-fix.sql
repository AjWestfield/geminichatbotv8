-- Emergency Fix for Messages Index Size Error
-- Run this FIRST if you need to quickly fix the error

-- 1. Drop ALL problematic indexes on messages table
DROP INDEX IF EXISTS idx_messages_chat_created CASCADE;
DROP INDEX IF EXISTS idx_messages_search CASCADE;
DROP INDEX IF EXISTS idx_messages_recent_active CASCADE;
DROP INDEX IF EXISTS idx_messages_content CASCADE;
DROP INDEX IF EXISTS idx_messages_composite CASCADE;

-- 2. Create only essential indexes WITHOUT the content column
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON public.messages(chat_id, created_at DESC);

-- 3. Verify the fix worked
SELECT 
    'Emergency fix applied!' as status,
    COUNT(*) as total_messages,
    MAX(length(content)) as largest_content_size
FROM public.messages;

-- 4. Show current indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'messages';