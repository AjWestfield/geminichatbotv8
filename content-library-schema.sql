-- Content Library Database Schema
-- This schema creates tables for managing uploaded content and platform publishing

-- Create content_library table
CREATE TABLE IF NOT EXISTS content_library (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'image', 'video', 'audio', 'document'
    mime_type TEXT,
    file_size BIGINT,
    title TEXT,
    description TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    platforms JSONB DEFAULT '{}'::jsonb, -- Platform-specific metadata and publish status
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    thumbnail_url TEXT,
    duration INTEGER, -- For video/audio files in seconds
    dimensions JSONB -- For images/videos: {width, height}
);

-- Create publishing_history table for tracking publish attempts
CREATE TABLE IF NOT EXISTS publishing_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id UUID REFERENCES content_library(id) ON DELETE CASCADE,
    platform TEXT NOT NULL, -- 'instagram', 'youtube', 'facebook', 'tiktok', 'x'
    status TEXT NOT NULL, -- 'pending', 'processing', 'published', 'failed'
    published_at TIMESTAMP WITH TIME ZONE,
    platform_post_id TEXT, -- ID of the post on the platform
    platform_url TEXT, -- URL to the published content
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content_collections table for organizing content
CREATE TABLE IF NOT EXISTS content_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    content_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create junction table for content-collection relationships
CREATE TABLE IF NOT EXISTS content_collection_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    collection_id UUID REFERENCES content_collections(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content_library(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(collection_id, content_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_library_user_id ON content_library(user_id);
CREATE INDEX IF NOT EXISTS idx_content_library_created_at ON content_library(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_library_file_type ON content_library(file_type);
CREATE INDEX IF NOT EXISTS idx_content_library_tags ON content_library USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_publishing_history_content_id ON publishing_history(content_id);
CREATE INDEX IF NOT EXISTS idx_publishing_history_platform ON publishing_history(platform);
CREATE INDEX IF NOT EXISTS idx_publishing_history_status ON publishing_history(status);
CREATE INDEX IF NOT EXISTS idx_content_collections_user_id ON content_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_content_collection_items_collection ON content_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_content_collection_items_content ON content_collection_items(content_id);

-- Update function for content_library updated_at
CREATE OR REPLACE FUNCTION update_content_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_content_library_updated_at
BEFORE UPDATE ON content_library
FOR EACH ROW
EXECUTE FUNCTION update_content_library_updated_at();

-- Update function for collections updated_at
CREATE OR REPLACE FUNCTION update_content_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for collections updated_at
CREATE TRIGGER update_content_collections_updated_at
BEFORE UPDATE ON content_collections
FOR EACH ROW
EXECUTE FUNCTION update_content_collections_updated_at();

-- Function to update collection content count
CREATE OR REPLACE FUNCTION update_collection_content_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE content_collections 
        SET content_count = content_count + 1
        WHERE id = NEW.collection_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE content_collections 
        SET content_count = GREATEST(0, content_count - 1)
        WHERE id = OLD.collection_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for collection content count
CREATE TRIGGER update_collection_content_count
AFTER INSERT OR DELETE ON content_collection_items
FOR EACH ROW
EXECUTE FUNCTION update_collection_content_count();

-- Row Level Security (RLS)
ALTER TABLE content_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_collection_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_library
CREATE POLICY "Users can view their own content" ON content_library
    FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own content" ON content_library
    FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own content" ON content_library
    FOR UPDATE USING (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own content" ON content_library
    FOR DELETE USING (auth.uid()::text = user_id OR user_id IS NULL);

-- RLS Policies for publishing_history
CREATE POLICY "Users can view their content publishing history" ON publishing_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM content_library 
            WHERE content_library.id = publishing_history.content_id 
            AND (content_library.user_id = auth.uid()::text OR content_library.user_id IS NULL)
        )
    );

-- RLS Policies for content_collections
CREATE POLICY "Users can view their own collections" ON content_collections
    FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "Users can create their own collections" ON content_collections
    FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own collections" ON content_collections
    FOR UPDATE USING (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own collections" ON content_collections
    FOR DELETE USING (auth.uid()::text = user_id OR user_id IS NULL);

-- RLS Policies for content_collection_items
CREATE POLICY "Users can view their collection items" ON content_collection_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM content_collections 
            WHERE content_collections.id = content_collection_items.collection_id 
            AND (content_collections.user_id = auth.uid()::text OR content_collections.user_id IS NULL)
        )
    );

CREATE POLICY "Users can manage their collection items" ON content_collection_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM content_collections 
            WHERE content_collections.id = content_collection_items.collection_id 
            AND (content_collections.user_id = auth.uid()::text OR content_collections.user_id IS NULL)
        )
    );