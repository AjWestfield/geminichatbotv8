# Database Timeout Fix

## Issue
When clicking on chat sessions in the sidebar, users receive a "Chat not found" error, but the actual issue is a database timeout (error code 57014) when fetching messages.

## Root Cause
The `messages` table lacks proper indexes, causing queries to timeout when loading chats with many messages.

## Solution

### 1. Run Database Optimization (Required)
```bash
npm run db:optimize-performance
```

This command will:
- Create optimized composite indexes on the messages table
- Add full-text search capabilities
- Vacuum and reindex all tables
- Update table statistics

Follow the prompts to execute the SQL script in your Supabase dashboard.

### 2. Check if Optimization is Needed
```bash
npm run db:check-optimization
```

This will analyze your database and recommend if optimization is needed.

### 3. Verify Fix
After running the optimization:
```bash
npm run db:check-fixed
```

## Code Changes Implemented

1. **Query Optimization**: Added a 1000 message limit to prevent timeouts on large chats
2. **Timeout Handling**: Distinguished timeout errors from "not found" errors
3. **Better Error Messages**: Users now see specific messages about database optimization
4. **Increased Timeout**: Supabase client timeout increased to 30 seconds
5. **Helpful UI**: Error toasts now include instructions on how to fix the issue

## Prevention
- Run `npm run db:optimize-performance` periodically if you have many messages
- Monitor query performance with `npm run db:check-optimization`
- The optimization creates indexes that significantly speed up message queries

## Technical Details
The optimization creates these indexes:
- `idx_messages_chat_id_created_at` - Composite index for fast chat message queries
- `idx_messages_content_search` - Full-text search index
- Various other performance indexes

These indexes dramatically reduce query time from potentially 10+ seconds to milliseconds.