-- Additional fixes for image loading and persistence
-- Run this after fix-image-persistence.sql

-- 1. Debug function to check image visibility
CREATE OR REPLACE FUNCTION debug_image_visibility()
RETURNS TABLE (
    check_name TEXT,
    result TEXT,
    details JSONB
) AS $$
BEGIN
    -- Check total image count
    RETURN QUERY
    SELECT 
        'Total images in database'::TEXT,
        COUNT(*)::TEXT,
        jsonb_build_object(
            'total', COUNT(*),
            'with_chat', COUNT(CASE WHEN chat_id IS NOT NULL THEN 1 END),
            'without_chat', COUNT(CASE WHEN chat_id IS NULL THEN 1 END)
        )
    FROM images;

    -- Check images by upload status
    RETURN QUERY
    SELECT 
        'Images by type'::TEXT,
        'See details'::TEXT,
        jsonb_build_object(
            'uploaded', COUNT(CASE WHEN is_uploaded = true THEN 1 END),
            'generated', COUNT(CASE WHEN is_uploaded = false THEN 1 END)
        )
    FROM images;

    -- Check recent images
    RETURN QUERY
    SELECT 
        'Recent images (last 24h)'::TEXT,
        COUNT(*)::TEXT,
        jsonb_build_object(
            'count', COUNT(*),
            'urls_valid', COUNT(CASE WHEN url IS NOT NULL AND url != '' THEN 1 END)
        )
    FROM images
    WHERE created_at > NOW() - INTERVAL '24 hours';

    -- Check for data URL issues
    RETURN QUERY
    SELECT 
        'Images with data URLs'::TEXT,
        COUNT(*)::TEXT,
        jsonb_build_object(
            'count', COUNT(*),
            'percentage', ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM images), 0)), 2)
        )
    FROM images
    WHERE url LIKE 'data:%';

    -- Check RLS policies
    RETURN QUERY
    SELECT 
        'RLS Policy Status'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'images' AND policyname LIKE '%read%')
            THEN 'Policies exist'
            ELSE 'No read policies found'
        END::TEXT,
        jsonb_build_object(
            'policy_count', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'images')
        );

    -- Check chat associations
    RETURN QUERY
    SELECT 
        'Chat associations'::TEXT,
        'See details'::TEXT,
        jsonb_build_object(
            'total_chats', (SELECT COUNT(DISTINCT chat_id) FROM images WHERE chat_id IS NOT NULL),
            'default_chat_exists', EXISTS(SELECT 1 FROM chats WHERE title = 'Direct Image Uploads'),
            'orphaned_images', (SELECT COUNT(*) FROM images WHERE chat_id IS NULL)
        );
END;
$$ LANGUAGE plpgsql;

-- 2. Function to fix orphaned images (more aggressive)
CREATE OR REPLACE FUNCTION fix_all_orphaned_images()
RETURNS INTEGER AS $$
DECLARE
    default_chat_id UUID;
    fixed_count INTEGER;
BEGIN
    -- Get or create default uploads chat
    SELECT id INTO default_chat_id
    FROM chats
    WHERE title = 'Direct Image Uploads'
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_chat_id IS NULL THEN
        INSERT INTO chats (title, model, created_at, updated_at)
        VALUES ('Direct Image Uploads', 'gemini-2.0-flash', NOW(), NOW())
        RETURNING id INTO default_chat_id;
        
        RAISE NOTICE 'Created default chat: %', default_chat_id;
    END IF;
    
    -- Fix all orphaned images
    UPDATE images
    SET chat_id = default_chat_id
    WHERE chat_id IS NULL;
    
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    
    RAISE NOTICE 'Fixed % orphaned images', fixed_count;
    RETURN fixed_count;
END;
$$ LANGUAGE plpgsql;

-- 3. Ensure all existing images have proper associations
SELECT fix_all_orphaned_images();

-- 4. Create a more robust loadAllImages function
CREATE OR REPLACE FUNCTION load_all_images_fixed(
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
    -- First ensure no orphaned images
    PERFORM fix_all_orphaned_images();
    
    -- Return all images
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
    WHERE i.url IS NOT NULL 
        AND i.url != ''
        AND i.url NOT LIKE 'blob:%'  -- Exclude temporary blob URLs
    ORDER BY i.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 5. Update RLS policies to be more permissive (for debugging)
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON images;
DROP POLICY IF EXISTS "Enable insert access for all users" ON images;
DROP POLICY IF EXISTS "Enable update access for all users" ON images;
DROP POLICY IF EXISTS "Enable delete access for all users" ON images;

-- Create new super permissive policies
CREATE POLICY "Allow all operations on images" ON images
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 6. Grant all necessary permissions
GRANT ALL ON images TO anon, authenticated;
GRANT ALL ON FUNCTION debug_image_visibility TO anon, authenticated;
GRANT ALL ON FUNCTION fix_all_orphaned_images TO anon, authenticated;
GRANT ALL ON FUNCTION load_all_images_fixed TO anon, authenticated;

-- 7. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_images_url_not_null 
ON images(created_at DESC) 
WHERE url IS NOT NULL AND url != '';

-- 8. Run diagnostics
SELECT * FROM debug_image_visibility();

-- 9. Show sample of recent images
SELECT 
    id,
    chat_id,
    substring(prompt, 1, 50) as prompt_preview,
    model,
    is_uploaded,
    created_at,
    CASE 
        WHEN url LIKE 'data:%' THEN 'data URL'
        WHEN url LIKE 'blob:%' THEN 'blob URL'
        WHEN url LIKE 'https://%' THEN 'https URL'
        ELSE 'other'
    END as url_type
FROM images
ORDER BY created_at DESC
LIMIT 10;

-- 10. Create a view for the API to use
CREATE OR REPLACE VIEW api_images AS
SELECT 
    i.*,
    c.title as chat_title
FROM images i
LEFT JOIN chats c ON i.chat_id = c.id
WHERE i.url IS NOT NULL 
    AND i.url != ''
    AND i.url NOT LIKE 'blob:%';

GRANT SELECT ON api_images TO anon, authenticated;