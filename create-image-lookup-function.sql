-- Create RPC function to help with image lookup by local ID
-- This function is used as a fallback in the deleteImage function

CREATE OR REPLACE FUNCTION get_image_by_local_id(local_id TEXT)
RETURNS TABLE (
    id UUID,
    url TEXT,
    metadata JSONB,
    chat_id UUID
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.url,
        i.metadata,
        i.chat_id
    FROM public.images i
    WHERE 
        -- Try different ways to match the local ID in metadata
        i.metadata->>'localId' = local_id
        OR i.metadata->'localId' = to_jsonb(local_id)
        OR i.metadata @> jsonb_build_object('localId', local_id)
    LIMIT 1;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_image_by_local_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_image_by_local_id(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_image_by_local_id(TEXT) TO service_role;

-- Test the function
-- SELECT * FROM get_image_by_local_id('img_abc123');