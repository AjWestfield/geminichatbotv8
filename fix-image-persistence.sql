-- Fix Image Persistence Issues
-- This script ensures images are properly saved and loaded

-- 1. First, let's check for orphaned images (images without chat_id)
SELECT COUNT(*) as orphaned_images_count
FROM images
WHERE chat_id IS NULL;

-- 2. Create a default chat for orphaned images if needed
DO $$
DECLARE
    default_chat_id UUID;
BEGIN
    -- Check if we have orphaned images
    IF EXISTS (SELECT 1 FROM images WHERE chat_id IS NULL) THEN
        -- Check if default uploads chat exists
        SELECT id INTO default_chat_id
        FROM chats
        WHERE title = 'Direct Image Uploads'
        LIMIT 1;
        
        -- Create default chat if it doesn't exist
        IF default_chat_id IS NULL THEN
            INSERT INTO chats (title, model, created_at, updated_at)
            VALUES ('Direct Image Uploads', 'gemini-2.0-flash', NOW(), NOW())
            RETURNING id INTO default_chat_id;
            
            RAISE NOTICE 'Created default chat for uploads: %', default_chat_id;
        END IF;
        
        -- Associate orphaned images with the default chat
        UPDATE images
        SET chat_id = default_chat_id
        WHERE chat_id IS NULL;
        
        RAISE NOTICE 'Associated orphaned images with default chat';
    END IF;
END $$;

-- 3. Create or replace function to get all images (including uploaded ones)
CREATE OR REPLACE FUNCTION get_all_user_images(
    p_limit INTEGER DEFAULT 1000
)
RETURNS TABLE (
    id UUID,
    chat_id UUID,
    message_id UUID,
    url TEXT,
    prompt TEXT,
    revised_prompt TEXT,
    quality TEXT,
    style TEXT,
    size TEXT,
    model TEXT,
    is_uploaded BOOLEAN,
    original_image_id TEXT,
    created_at TIMESTAMPTZ,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.chat_id,
        i.message_id,
        i.url,
        i.prompt,
        i.revised_prompt,
        i.quality,
        i.style,
        i.size,
        i.model,
        i.is_uploaded,
        i.original_image_id,
        i.created_at,
        i.metadata
    FROM images i
    ORDER BY i.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 4. Update the chat_summaries view to properly count all images
DROP VIEW IF EXISTS chat_summaries CASCADE;

CREATE VIEW chat_summaries AS
SELECT 
    c.id,
    c.title,
    c.model,
    c.created_at,
    c.updated_at,
    -- Get message count
    COALESCE(
        (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id),
        0
    ) AS message_count,
    -- Get image count (including uploaded images)
    COALESCE(
        (SELECT COUNT(*) FROM images i WHERE i.chat_id = c.id),
        0
    ) AS image_count,
    -- Get video count
    COALESCE(
        (SELECT COUNT(*) FROM videos v WHERE v.chat_id = c.id),
        0
    ) AS video_count,
    -- Get image thumbnails (first 6 images, including uploaded)
    COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', i.id,
                    'url', i.url,
                    'prompt', i.prompt,
                    'is_uploaded', i.is_uploaded,
                    'model', i.model
                )
                ORDER BY i.created_at DESC
            )
            FROM (
                SELECT * FROM images 
                WHERE chat_id = c.id 
                ORDER BY created_at DESC 
                LIMIT 6
            ) i
        ),
        '[]'::jsonb
    ) AS image_thumbnails,
    -- Get last message preview
    (
        SELECT m.content
        FROM messages m
        WHERE m.chat_id = c.id AND m.role = 'user'
        ORDER BY m.created_at DESC
        LIMIT 1
    ) AS last_message
FROM chats c;

-- 5. Add index to improve image loading performance
CREATE INDEX IF NOT EXISTS idx_images_chat_id_created_at 
ON images(chat_id, created_at DESC);

-- 6. Create a debug view to help diagnose issues
CREATE OR REPLACE VIEW image_debug_info AS
SELECT 
    i.id,
    i.chat_id,
    c.title as chat_title,
    i.url,
    i.prompt,
    i.model,
    i.is_uploaded,
    i.created_at,
    i.metadata,
    CASE 
        WHEN i.url LIKE 'blob:%' THEN 'blob'
        WHEN i.url LIKE 'data:%' THEN 'data'
        WHEN i.url LIKE 'https://%' THEN 'https'
        ELSE 'other'
    END as url_type,
    CASE
        WHEN i.chat_id IS NULL THEN 'orphaned'
        WHEN c.id IS NULL THEN 'invalid_chat'
        ELSE 'valid'
    END as status
FROM images i
LEFT JOIN chats c ON i.chat_id = c.id
ORDER BY i.created_at DESC;

-- 7. Function to ensure image has valid chat association
CREATE OR REPLACE FUNCTION ensure_image_chat_association()
RETURNS TRIGGER AS $$
DECLARE
    default_chat_id UUID;
BEGIN
    -- If chat_id is NULL, assign to default chat
    IF NEW.chat_id IS NULL THEN
        -- Get or create default uploads chat
        SELECT id INTO default_chat_id
        FROM chats
        WHERE title = 'Direct Image Uploads'
        LIMIT 1;
        
        IF default_chat_id IS NULL THEN
            INSERT INTO chats (title, model)
            VALUES ('Direct Image Uploads', 'gemini-2.0-flash')
            RETURNING id INTO default_chat_id;
        END IF;
        
        NEW.chat_id := default_chat_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to ensure images always have a chat
DROP TRIGGER IF EXISTS ensure_image_chat ON images;
CREATE TRIGGER ensure_image_chat
    BEFORE INSERT ON images
    FOR EACH ROW
    EXECUTE FUNCTION ensure_image_chat_association();

-- 9. Grant permissions
GRANT SELECT ON image_debug_info TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_all_user_images TO anon, authenticated;

-- 10. Display current image statistics
SELECT 
    COUNT(*) as total_images,
    COUNT(CASE WHEN is_uploaded = true THEN 1 END) as uploaded_images,
    COUNT(CASE WHEN is_uploaded = false THEN 1 END) as generated_images,
    COUNT(CASE WHEN chat_id IS NULL THEN 1 END) as orphaned_images,
    COUNT(DISTINCT chat_id) as unique_chats
FROM images;

-- 11. Show recent images for debugging
SELECT 
    id,
    chat_id,
    prompt,
    model,
    is_uploaded,
    created_at,
    url_type,
    status
FROM image_debug_info
LIMIT 10;