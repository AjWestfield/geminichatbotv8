## Fix for Image Persistence RLS Policy Error

### Problem:
You're getting the error: `"new row violates row-level security policy for table 'images'"` when trying to save images.

### Solution:
Run the SQL script `fix-images-rls-policy.sql` in your Supabase SQL Editor.

### Steps:
1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `fix-images-rls-policy.sql`
4. Click "Run" to execute the script
5. You should see a success message: "RLS policy test successful"

### What the script does:
- Drops any existing conflicting policies
- Creates new permissive policies for SELECT, INSERT, UPDATE, and DELETE operations
- Grants necessary permissions to anon, authenticated, and service_role users
- Tests the policy with a dummy insert/delete operation

### After running the script:
- Test image generation in your app
- Images should now save successfully to the database
