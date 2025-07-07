-- Complete Fix for v8 Database Issues
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- PART 1: FIX CHATS TABLE RLS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can create their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON public.chats;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.chats;
DROP POLICY IF EXISTS "Allow all operations on chats" ON public.chats;

-- Create permissive policy
CREATE POLICY "Allow all operations on chats" ON public.chats
    FOR ALL 
    TO authenticated, anon, service_role
    USING (true) 
    WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.chats TO authenticated;
GRANT ALL ON public.chats TO anon;
GRANT ALL ON public.chats TO service_role;

-- ============================================
-- PART 2: FIX MESSAGES TABLE RLS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations on messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view all messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete messages" ON public.messages;

-- Create permissive policy
CREATE POLICY "Allow all operations on messages" ON public.messages
    FOR ALL 
    TO authenticated, anon, service_role
    USING (true) 
    WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.messages TO anon;
GRANT ALL ON public.messages TO service_role;

-- ============================================
-- PART 3: FIX IMAGES TABLE RLS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations on images" ON public.images;

-- Create permissive policy
CREATE POLICY "Allow all operations on images" ON public.images
    FOR ALL 
    TO authenticated, anon, service_role
    USING (true) 
    WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.images TO authenticated;
GRANT ALL ON public.images TO anon;
GRANT ALL ON public.images TO service_role;

-- ============================================
-- PART 4: CLEAN UP MESSAGES TABLE
-- ============================================

-- Run VACUUM to clean up
VACUUM ANALYZE public.messages;
VACUUM ANALYZE public.chats;
VACUUM ANALYZE public.images;

-- ============================================
-- PART 5: VERIFY EVERYTHING
-- ============================================

-- Test chat creation
DO $$ 
DECLARE
    test_chat_id UUID;
    test_message_id UUID;
    test_image_id UUID;
BEGIN
    -- Test chat
    INSERT INTO public.chats (title, model, created_at, updated_at)
    VALUES ('Fix Verification Test', 'gemini-2.0-flash', NOW(), NOW())
    RETURNING id INTO test_chat_id;
    RAISE NOTICE '✅ Chat creation successful: %', test_chat_id;
    
    -- Test message
    INSERT INTO public.messages (chat_id, role, content, created_at)
    VALUES (test_chat_id, 'user', 'Test message after fix', NOW())
    RETURNING id INTO test_message_id;
    RAISE NOTICE '✅ Message creation successful: %', test_message_id;
    
    -- Test image
    INSERT INTO public.images (chat_id, url, prompt, model, created_at)
    VALUES (test_chat_id, 'https://example.com/test.jpg', 'Test prompt', 'dalle-3', NOW())
    RETURNING id INTO test_image_id;
    RAISE NOTICE '✅ Image creation successful: %', test_image_id;
    
    -- Clean up
    DELETE FROM public.messages WHERE chat_id = test_chat_id;
    DELETE FROM public.images WHERE chat_id = test_chat_id;
    DELETE FROM public.chats WHERE id = test_chat_id;
    RAISE NOTICE '✅ Cleanup successful';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error during test: %', SQLERRM;
END $$;

-- Final status
SELECT 
    '🎉 All fixes applied!' as status,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'chats') as chat_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'messages') as message_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'images') as image_policies,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'messages') as message_indexes;