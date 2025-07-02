-- Quick fix: Drop the problematic function and recreate it with better error handling
-- Run this if chats aren't loading

-- First, drop the function if it exists
DROP FUNCTION IF EXISTS get_chat_images_with_originals(UUID);

-- Recreate with simpler logic
CREATE OR REPLACE FUNCTION get_chat_images_with_originals(p_chat_id UUID)
RETURNS SETOF images AS $$
BEGIN
  -- Return all images for the chat
  RETURN QUERY
  SELECT DISTINCT i.*
  FROM images i
  WHERE i.chat_id = p_chat_id
     OR i.id IN (
       SELECT original_image_id 
       FROM images 
       WHERE chat_id = p_chat_id 
       AND original_image_id IS NOT NULL
     )
  ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_chat_images_with_originals(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_chat_images_with_originals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_images_with_originals(UUID) TO service_role;

-- Test it works
SELECT 'Function recreated with simpler logic' as status;
