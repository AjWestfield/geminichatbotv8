-- Complete SQL script to fix multi-image edit display issue

-- 1. Create image_source_relations table to track multi-image edit relationships
CREATE TABLE IF NOT EXISTS image_source_relations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  edited_image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  source_image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  source_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique relationship per edited image and source order
  UNIQUE(edited_image_id, source_order)
);

-- 2. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_image_source_relations_edited ON image_source_relations(edited_image_id);
CREATE INDEX IF NOT EXISTS idx_image_source_relations_source ON image_source_relations(source_image_id);

-- 3. Add comment to explain the table
COMMENT ON TABLE image_source_relations IS 'Tracks relationships between edited images and their source images for multi-image edits';

-- 4. Create RPC function to get source images for multi-image edits
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

-- 5. Grant permissions (adjust if needed based on your setup)
GRANT ALL ON image_source_relations TO authenticated;
GRANT ALL ON image_source_relations TO service_role;
GRANT EXECUTE ON FUNCTION get_source_images(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_source_images(UUID) TO service_role;
