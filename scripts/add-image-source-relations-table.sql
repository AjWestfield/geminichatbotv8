-- Create image_source_relations table to track multi-image edit relationships
CREATE TABLE IF NOT EXISTS image_source_relations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  edited_image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  source_image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  source_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique relationship per edited image and source order
  UNIQUE(edited_image_id, source_order)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_image_source_relations_edited ON image_source_relations(edited_image_id);
CREATE INDEX IF NOT EXISTS idx_image_source_relations_source ON image_source_relations(source_image_id);

-- Add comment to explain the table
COMMENT ON TABLE image_source_relations IS 'Tracks relationships between edited images and their source images for multi-image edits';
