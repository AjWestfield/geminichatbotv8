# Chat Loading & Tooltip Images Fix Instructions

## Issues Identified

1. **Chat sessions not loading when clicked**
2. **Tooltip images not appearing when hovering over chat sessions**

## Root Causes

1. **Missing Image Thumbnails**: The database view `chat_summaries` needs to be updated to include image thumbnails
2. **Potential timeout issues**: Large chats might be timing out during loading

## Fix Instructions

### Step 1: Update Database View (Required for Image Thumbnails)

1. Open your Supabase Dashboard
2. Go to the SQL Editor
3. Open and run the script: `scripts/database/add-image-thumbnails-to-chat-summaries.sql`
   
   Or manually run this SQL:
   ```sql
   -- Drop existing view
   DROP VIEW IF EXISTS chat_summaries;

   -- Create enhanced view with image thumbnails
   CREATE OR REPLACE VIEW chat_summaries AS
   SELECT 
       c.id,
       c.title,
       c.model,
       c.created_at,
       c.updated_at,
       c.user_id,
       (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id AND m.role = 'user') as message_count,
       (SELECT COUNT(*) FROM images i WHERE i.chat_id = c.id) as image_count,
       (SELECT COUNT(*) FROM videos v WHERE v.chat_id = c.id) as video_count,
       (SELECT MAX(m.created_at) FROM messages m WHERE m.chat_id = c.id) as last_message_at,
       -- Image thumbnails
       (SELECT COALESCE(
           json_agg(
               json_build_object(
                   'id', i.id, 
                   'url', i.url, 
                   'prompt', i.prompt
               )
               ORDER BY i.created_at DESC
           ) FILTER (WHERE i.url IS NOT NULL), 
           '[]'::json
       )::jsonb
       FROM (
           SELECT id, url, prompt, created_at 
           FROM images 
           WHERE chat_id = c.id 
           ORDER BY created_at DESC 
           LIMIT 6
       ) i) as image_thumbnails
   FROM chats c;

   -- Grant permissions
   GRANT SELECT ON chat_summaries TO authenticated;
   GRANT SELECT ON chat_summaries TO anon;
   ```

### Step 2: Debug Chat Loading Issues

1. **Test in browser**: Open `http://localhost:3000/test-chat-loading.html` to debug:
   - See which chats are failing to load
   - Check load times
   - View console errors

2. **Run debug script** (if using Supabase):
   ```bash
   node debug-chat-loading.js
   ```

3. **Check browser console** when clicking chats in the main app for any JavaScript errors

### Step 3: Fix Database Performance (if needed)

If chats are timing out due to too many messages:

```bash
npm run db:optimize-performance
```

Or run the optimization script manually in Supabase.

### Step 4: Verify Fixes

1. **Hover over chat sessions** - you should now see:
   - Chat title
   - Created/updated dates
   - Message and image counts
   - Up to 6 image thumbnails

2. **Click on chat sessions** - they should load without errors

### Troubleshooting

If issues persist:

1. **Clear browser cache** and reload
2. **Check network tab** in browser DevTools for failed requests
3. **Ensure Supabase is running** and accessible
4. **Check API keys** are correctly configured

### Alternative: Use Local Storage

If database issues persist, you can temporarily use local storage:
- Add `?localStorage=true` to the URL
- The app will use browser storage instead of the database