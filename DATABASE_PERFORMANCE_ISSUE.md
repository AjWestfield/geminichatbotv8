# Database Performance Issue - Critical

## Current Status

Your database is experiencing severe performance issues. The messages query is taking 7+ seconds even with the index created. This indicates a deeper problem.

## Immediate Workarounds Applied

1. **Reduced message limit** to just 10 messages
2. **Aggressive 3-second timeout** on queries
3. **Graceful fallback** - chat loads without messages if query times out

## Root Cause Analysis

The index `idx_messages_chat_id_created_at_desc` was created successfully, but the query is still slow. Possible causes:

1. **Index not being used** - The query planner might not be using the index
2. **Table bloat** - Too many dead rows need vacuuming
3. **Resource limits** - Free tier Supabase limitations
4. **Missing statistics** - Table statistics need updating

## Immediate Actions Required

### 1. Run VACUUM and ANALYZE

In Supabase SQL Editor, run these commands one at a time:

```sql
-- Clean up dead rows
VACUUM ANALYZE messages;

-- Update all statistics
ANALYZE messages;

-- Force index usage
SET enable_seqscan = OFF;

-- Test the query
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, chat_id, role, content, created_at, attachments
FROM messages
WHERE chat_id = '872f2da8-21e9-48f8-bd8d-af70ca7ee180'
ORDER BY created_at DESC
LIMIT 50;
```

### 2. Check Query Plan

Look at the EXPLAIN output. It should show:
- `Index Scan using idx_messages_chat_id_created_at_desc`
- If it shows `Seq Scan`, the index is not being used

### 3. Alternative Index Strategy

If the current index isn't working, try this compound index:

```sql
-- Drop the old index
DROP INDEX IF EXISTS idx_messages_chat_id_created_at_desc;

-- Create a more specific index
CREATE INDEX idx_messages_chat_created 
ON messages(chat_id, created_at DESC) 
INCLUDE (id, role, content, attachments);
```

### 4. Check Table Size

```sql
-- Check table statistics
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_tup_ins AS inserts,
  n_tup_upd AS updates,
  n_tup_del AS deletes,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows
FROM pg_stat_user_tables 
WHERE tablename = 'messages';
```

## Long-term Solutions

1. **Upgrade Supabase Plan** - Free tier has performance limitations
2. **Implement Pagination** - Load messages on demand, not all at once
3. **Archive Old Messages** - Move old messages to archive table
4. **Use Materialized Views** - Pre-compute message queries

## Testing After Fixes

After applying database fixes, test with:

```bash
node test-actual-db-timing.js
```

Messages should load in < 500ms for the index to be effective.

## Current Behavior

With the emergency fixes:
- Chat loads but shows only 10 recent messages
- If even that times out, chat loads with no messages
- You can still send new messages
- The app remains functional but limited

## Contact Support

If these fixes don't help, contact Supabase support with:
1. Your query plan output
2. Table statistics
3. The slow query details