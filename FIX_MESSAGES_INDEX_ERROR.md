# Fix for PostgreSQL Index Size Error

## Problem
You encountered this error:
```
ERROR: 54000: index row requires 2362416 bytes, maximum size is 8191
```

This happens because your messages table contains very large content (over 2MB) that exceeds PostgreSQL's index size limit.

## Quick Emergency Fix

Run this in your Supabase SQL Editor immediately to fix the error:

1. **Go to**: https://bsocqrwrikfmymklgart.supabase.com/project/bsocqrwrikfmymklgart/sql/new

2. **Run the emergency fix**:
```sql
-- Copy and paste the contents of:
-- scripts/database/emergency-index-fix.sql
```

This will:
- Drop all problematic indexes
- Create new indexes without the large content column
- Get your database working again immediately

## Comprehensive Fix (Recommended)

After the emergency fix, run the comprehensive optimization:

```sql
-- Copy and paste the contents of:
-- scripts/database/fix-messages-index-size.sql
```

This will:
- Create optimized indexes for better performance
- Add text search capabilities (GIN index)
- Create partial indexes for common queries
- Identify messages with extremely large content
- Set up proper constraints to prevent future issues

## What Caused This?

Some messages in your database have content larger than 2MB. PostgreSQL's btree indexes have a maximum size limit of 8191 bytes per row. When an index tries to include these large content fields, it fails.

## The Solution

The fix creates indexes that:
1. **Exclude the content column** - Indexes only use chat_id, created_at, role, etc.
2. **Use GIN indexes for text search** - Better suited for large text
3. **Create partial indexes** - Optimized for specific query patterns

## Verify the Fix

After running the scripts, verify with:
```bash
npm run db:check
```

You should see:
- ✓ Database connection successful
- ✓ All required tables exist
- ✓ Test operations complete

## Prevention

To prevent this in the future:
1. The scripts add a text search column that only indexes the first 1MB of content
2. Consider adding a content size limit (uncomment the constraint in the comprehensive fix)
3. Regularly monitor for large messages using the large_messages_summary table

## Large Content Analysis

The comprehensive fix creates a `large_messages_summary` table showing:
- Which messages have extremely large content
- How large they are
- When they were created

You can query this table to understand what's causing the large content:
```sql
SELECT * FROM public.large_messages_summary 
ORDER BY content_length DESC 
LIMIT 10;
```