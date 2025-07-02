-- Create RPC function to get source images for multi-image edits
CREATE OR REPLACE FUNCTION get_source_images(edited_id UUID)
RETURNS TABLE (
  image_id UUID,
  source_order INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT source_image_id AS image_id, source_order
  FROM image_source_relations
  WHERE edited_image_id = edited_id
  ORDER BY source_order;
END;
$$ LANGUAGE plpgsql;
