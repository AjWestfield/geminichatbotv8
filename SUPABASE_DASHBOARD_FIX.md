# Supabase Security Definer Fix - Dashboard Method

## 🎯 Easiest Solution: Use Supabase Dashboard

Supabase has a built-in fix for this exact issue:

1. Go to your Supabase Dashboard
2. Navigate to **Table Editor**
3. Find the `chat_summaries` view
4. Look for a **warning icon** about the view being accessible via API
5. Click the **"Fix"** or **"Apply Security Fix"** button
6. Supabase will automatically apply the correct fix for your PostgreSQL version

## 🔧 Manual SQL Fix (If Dashboard Method Doesn't Work)

If you need to fix it via SQL, here's the minimal approach:

```sql
-- 1. Drop and recreate as a simple view
DROP VIEW IF EXISTS public.chat_summaries CASCADE;

-- 2. Create basic view (no complex features)
CREATE VIEW public.chat_summaries AS
SELECT 
    id,
    title,
    model,
    created_at,
    updated_at,
    metadata
FROM chats;

-- 3. Grant permissions
GRANT SELECT ON public.chat_summaries TO anon;
GRANT SELECT ON public.chat_summaries TO authenticated;
```

## 🤔 Why The Permission Error?

The permission error occurs because:
- Supabase SQL Editor runs with restricted permissions
- Creating functions requires elevated privileges
- The public schema has security restrictions

## ✅ Verification

After applying either fix:
1. Run the Supabase Linter again
2. The SECURITY DEFINER error should be gone
3. Your app should continue working normally

## 🚀 Alternative: Use Supabase RPC

If views continue to be problematic, consider using Supabase RPC functions instead:

```javascript
// Instead of querying a view
const { data } = await supabase
  .from('chat_summaries')
  .select('*')

// Use an RPC function
const { data } = await supabase
  .rpc('get_chat_summaries')
```

This gives you more control over security context.