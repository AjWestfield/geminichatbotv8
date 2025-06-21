# Applying Database Migrations

This guide explains how to apply database migrations for new features in the Gemini AI Chatbot.

## Current Issue: Missing Image Thumbnails

The image thumbnails feature requires a database view update. Follow these steps to enable it:

## Method 1: Automated Script (Recommended)

Run the migration script from your terminal:

```bash
node scripts/database/apply-image-thumbnails-migration.js
```

This script will:
- Check if the migration is needed
- Apply the changes if possible
- Provide manual instructions if needed

## Method 2: Manual Application via Supabase Dashboard

1. **Access Supabase SQL Editor**
   - Go to your [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Navigate to SQL Editor (left sidebar)
   - Click "New query"

2. **Run the Migration Script**
   - Copy the entire contents of: `scripts/database/add-image-thumbnails-to-chat-summaries.sql`
   - Paste into the SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

3. **Verify Success**
   - You should see a success message
   - The last query shows sample data with thumbnail counts

4. **Refresh Your Application**
   - Hard refresh your browser (Cmd/Ctrl + Shift + R)
   - Hover over chats with images to see thumbnails

## Troubleshooting

### Thumbnails Still Not Showing?

1. **Check Console Logs**
   - Open browser DevTools (F12)
   - Look for `[ChatListItem]` logs
   - Should show `hasThumbnails: true` for chats with images

2. **Verify Database View**
   - Run this query in Supabase SQL Editor:
   ```sql
   SELECT 
     title,
     image_count,
     jsonb_array_length(image_thumbnails) as thumbnail_count
   FROM chat_summaries
   WHERE image_count > 0
   LIMIT 5;
   ```

3. **Clear Browser Cache**
   - Sometimes cached API responses need clearing
   - Try incognito/private mode

### Common Issues

- **"Thumbnails not yet available" message**: Database view needs updating
- **Console shows `hasThumbnails: false`**: Migration hasn't been applied
- **No logs appearing**: Refresh the page and hover over a chat

## Other Migrations

Similar process applies for other database changes:

1. Look for SQL scripts in `scripts/database/`
2. Run via automated script or manual SQL
3. Refresh application
4. Check feature functionality

## Need Help?

If migrations aren't working:
1. Check Supabase connection in `.env.local`
2. Ensure you have proper database permissions
3. Try running SQL directly in Supabase dashboard
4. Check browser console for errors