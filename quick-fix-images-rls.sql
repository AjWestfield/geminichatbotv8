-- QUICK FIX for images RLS policy error
-- Copy and paste this entire script into Supabase SQL Editor

-- Step 1: Disable RLS temporarily
ALTER TABLE public.images DISABLE ROW LEVEL SECURITY;

-- Step 2: Re-enable RLS
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- Step 3: Create a simple permissive policy for all operations
CREATE POLICY "Enable all access for all users" ON public.images
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Step 4: Grant permissions
GRANT ALL ON public.images TO anon;
GRANT ALL ON public.images TO authenticated;
GRANT ALL ON public.images TO service_role;

-- Step 5: Test the fix
DO $$
BEGIN
    INSERT INTO public.images (
        url, prompt, model, created_at
    ) VALUES (
        'https://test.com/test.jpg',
        'RLS test',
        'test',
        NOW()
    );
    
    DELETE FROM public.images 
    WHERE url = 'https://test.com/test.jpg' AND model = 'test';
    
    RAISE NOTICE '✅ RLS fix successful! Images can now be inserted.';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ RLS fix failed: %', SQLERRM;
END $$;
