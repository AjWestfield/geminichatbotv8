-- Check if the index exists and its definition
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'messages' 
AND indexname LIKE '%chat_id%';

-- Check query execution plan
EXPLAIN (ANALYZE, BUFFERS) 
SELECT id, chat_id, role, content, created_at, attachments
FROM messages
WHERE chat_id = '872f2da8-21e9-48f8-bd8d-af70ca7ee180'
ORDER BY created_at DESC
LIMIT 50;