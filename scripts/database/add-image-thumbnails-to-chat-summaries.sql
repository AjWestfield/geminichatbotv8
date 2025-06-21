-- Add image thumbnails to chat_summaries view
-- This script updates the chat_summaries view to include thumbnail URLs for the first 6 images
-- Run this in Supabase SQL Editor

-- Drop the existing view if it exists
DROP VIEW IF EXISTS chat_summaries;

-- Create enhanced chat_summaries view with image thumbnails
CREATE OR REPLACE VIEW chat_summaries AS
SELECT 
    c.id,
    c.title,
    c.model,
    c.created_at,
    c.updated_at,
    c.user_id,
    -- Count only user messages (not assistant messages)
    (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id AND m.role = 'user') as message_count,
    -- Count total images
    (SELECT COUNT(*) FROM images i WHERE i.chat_id = c.id) as image_count,
    -- Count total videos
    (SELECT COUNT(*) FROM videos v WHERE v.chat_id = c.id) as video_count,
    -- Get last message timestamp
    (SELECT MAX(m.created_at) FROM messages m WHERE m.chat_id = c.id) as last_message_at,
    -- NEW: Get first 6 image thumbnails with their details
    (SELECT COALESCE(
        json_agg(
            json_build_object(
                'id', i.id, 
                'url', i.url, 
                'prompt', i.prompt
            )
            ORDER BY i.created_at DESC
        ) FILTER (WHERE i.url IS NOT NULL), 
        '[]'::json
    )::jsonb
    FROM (
        SELECT id, url, prompt, created_at 
        FROM images 
        WHERE chat_id = c.id 
        ORDER BY created_at DESC 
        LIMIT 6
    ) i) as image_thumbnails
FROM chats c;

-- Grant permissions on the view
GRANT SELECT ON chat_summaries TO authenticated;
GRANT SELECT ON chat_summaries TO anon;
GRANT SELECT ON chat_summaries TO service_role;

-- Verify the view was created successfully
SELECT 
    c.title,
    c.message_count,
    c.image_count,
    jsonb_array_length(c.image_thumbnails) as thumbnail_count,
    c.image_thumbnails
FROM chat_summaries c
WHERE c.image_count > 0
LIMIT 3;