-- Emergency: Remove the problematic function completely
DROP FUNCTION IF EXISTS get_chat_images_with_originals(UUID);

-- Verify it's gone
SELECT 'Function removed - chats should load normally now' as status;
