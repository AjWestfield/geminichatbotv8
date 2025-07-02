-- Simple Performance Fix - Just the essentials

-- Remove duplicate policies
DROP POLICY IF EXISTS "Enable all access for all users" ON images;
DROP POLICY IF EXISTS "Enable read access for all users" ON images;
DROP POLICY IF EXISTS "Enable insert access for all users" ON images;
DROP POLICY IF EXISTS "Enable update access for all users" ON images;
DROP POLICY IF EXISTS "Enable delete access for all users" ON images;

-- Remove duplicate indexes
DROP INDEX IF EXISTS idx_images_created_desc;
DROP INDEX IF EXISTS idx_messages_optimized;

-- Verify what's left
SELECT 'Policies remaining:' as info, COUNT(*) as count FROM pg_policies WHERE tablename = 'images';
SELECT 'Performance fix complete!' as status;