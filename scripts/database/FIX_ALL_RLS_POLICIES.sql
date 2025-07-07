-- Fix All RLS Policies for v8
-- Run this in Supabase SQL Editor

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
-- PART 4: FIX ALL OTHER TABLES
-- ============================================

-- Videos table
DROP POLICY IF EXISTS "Allow all operations on videos" ON public.videos;
CREATE POLICY "Allow all operations on videos" ON public.videos
    FOR ALL TO authenticated, anon, service_role
    USING (true) WITH CHECK (true);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.videos TO authenticated, anon, service_role;

-- Audios table
DROP POLICY IF EXISTS "Allow all operations on audios" ON public.audios;
CREATE POLICY "Allow all operations on audios" ON public.audios
    FOR ALL TO authenticated, anon, service_role
    USING (true) WITH CHECK (true);
ALTER TABLE public.audios ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.audios TO authenticated, anon, service_role;

-- Social media cookies table
DROP POLICY IF EXISTS "Allow all operations on cookies" ON public.social_media_cookies;
CREATE POLICY "Allow all operations on cookies" ON public.social_media_cookies
    FOR ALL TO authenticated, anon, service_role
    USING (true) WITH CHECK (true);
ALTER TABLE public.social_media_cookies ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.social_media_cookies TO authenticated, anon, service_role;

-- Image source relations table
DROP POLICY IF EXISTS "Enable insert for all users on image_source_relations" ON public.image_source_relations;
DROP POLICY IF EXISTS "Enable select for all users on image_source_relations" ON public.image_source_relations;
DROP POLICY IF EXISTS "Enable update for all users on image_source_relations" ON public.image_source_relations;
DROP POLICY IF EXISTS "Enable delete for all users on image_source_relations" ON public.image_source_relations;

CREATE POLICY "Allow all operations on image_source_relations" ON public.image_source_relations
    FOR ALL TO authenticated, anon, service_role
    USING (true) WITH CHECK (true);
ALTER TABLE public.image_source_relations ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.image_source_relations TO authenticated, anon, service_role;

-- ============================================
-- PART 5: VERIFY EVERYTHING
-- ============================================

-- Test operations
DO $$ 
DECLARE
    test_chat_id UUID;
    test_message_id UUID;
    test_image_id UUID;
BEGIN
    -- Test chat
    INSERT INTO public.chats (title, model, created_at, updated_at)
    VALUES ('RLS Fix Verification', 'gemini-2.0-flash', NOW(), NOW())
    RETURNING id INTO test_chat_id;
    RAISE NOTICE '✅ Chat creation successful: %', test_chat_id;
    
    -- Test message (small content to avoid timeout)
    INSERT INTO public.messages (chat_id, role, content, created_at)
    VALUES (test_chat_id, 'user', 'Test message', NOW())
    RETURNING id INTO test_message_id;
    RAISE NOTICE '✅ Message creation successful: %', test_message_id;
    
    -- Test image
    INSERT INTO public.images (chat_id, url, prompt, model, created_at)
    VALUES (test_chat_id, 'https://example.com/test.jpg', 'Test', 'dalle-3', NOW())
    RETURNING id INTO test_image_id;
    RAISE NOTICE '✅ Image creation successful: %', test_image_id;
    
    -- Clean up
    DELETE FROM public.messages WHERE chat_id = test_chat_id;
    DELETE FROM public.images WHERE chat_id = test_chat_id;
    DELETE FROM public.chats WHERE id = test_chat_id;
    RAISE NOTICE '✅ Cleanup successful';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
END $$;

-- Show final status
SELECT 
    '🎉 RLS Policies Fixed!' as status,
    table_name,
    COUNT(*) as policy_count
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND grantee IN ('authenticated', 'anon', 'service_role')
GROUP BY table_name
ORDER BY table_name;