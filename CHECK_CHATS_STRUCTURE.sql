-- Check the structure of the chats table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'chats'
ORDER BY ordinal_position;