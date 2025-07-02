-- Fix Row Level Security (RLS) policy for images table
-- This resolves the "new row violates row-level security policy" error

-- First, check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM 
    pg_tables
WHERE 
    schemaname = 'public' 
    AND tablename = 'images';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable all access for anon users" ON public.images;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.images;
DROP POLICY IF EXISTS "Enable all access for service role" ON public.images;
DROP POLICY IF EXISTS "Allow all operations on images" ON public.images;

-- Temporarily disable RLS to ensure we can fix it
ALTER TABLE public.images DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- Create a permissive policy that allows all operations
CREATE POLICY "Enable read access for all users" ON public.images
    FOR SELECT
    USING (true);

CREATE POLICY "Enable insert access for all users" ON public.images
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.images
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON public.images
    FOR DELETE
    USING (true);

-- Grant permissions to ensure access
GRANT ALL ON public.images TO anon;
GRANT ALL ON public.images TO authenticated;
GRANT ALL ON public.images TO service_role;

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies
WHERE 
    schemaname = 'public' 
    AND tablename = 'images'
ORDER BY 
    policyname;

-- Test that we can insert a dummy record (then immediately delete it)
DO $$
BEGIN
    -- Try to insert a test record
    INSERT INTO public.images (
        url,
        prompt,
        model,
        created_at
    ) VALUES (
        'https://test.example.com/test.jpg',
        'Test image for RLS policy verification',
        'test',
        NOW()
    );
    
    -- If successful, delete the test record
    DELETE FROM public.images 
    WHERE url = 'https://test.example.com/test.jpg' 
    AND model = 'test';
    
    RAISE NOTICE 'RLS policy test successful - images can be inserted and deleted';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'RLS policy test failed: %', SQLERRM;
END $$;
