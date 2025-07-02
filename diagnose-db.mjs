import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_API_KEY
);

console.log('🔍 Comprehensive Database Check...\n');

async function checkAllTables() {
  const tables = ['messages', 'chats', 'images', 'videos'];
  
  for (const table of tables) {
    const start = Date.now();
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    const duration = Date.now() - start;
    
    console.log(`Table: ${table}`);
    console.log(`  Count: ${count || 0} rows`);
    console.log(`  Query time: ${duration}ms`);
    console.log(`  Status: ${duration > 1000 ? '❌ SLOW' : '✅ OK'}`);
    console.log('');
  }
}

async function testChatLoad() {
  console.log('Testing chat load (like sidebar)...');
  const start = Date.now();
  
  const { data: chats, error } = await supabase
    .from('chats')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  
  const duration = Date.now() - start;
  console.log(`  Chat list query: ${duration}ms`);
  console.log(`  Found ${chats?.length || 0} chats`);
  
  if (chats && chats.length > 0) {
    // Test loading messages for first chat
    const chatId = chats[0].id;
    const msgStart = Date.now();
    
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    const msgDuration = Date.now() - msgStart;
    console.log(`  Messages query: ${msgDuration}ms`);
    console.log(`  Found ${messages?.length || 0} messages`);
  }
}

async function checkConnection() {
  console.log('\nChecking Supabase connection...');
  console.log(`  URL: ${process.env.SUPABASE_URL}`);
  console.log(`  API Key: ${process.env.SUPABASE_API_KEY ? '✓ Set' : '✗ Missing'}`);
}

async function main() {
  await checkConnection();
  console.log('\n');
  await checkAllTables();
  console.log('\n');
  await testChatLoad();
  
  console.log('\n📊 Diagnosis:');
  console.log('If any query > 1000ms, run the optimization in Supabase.');
  console.log('If tables are empty, the app may be using wrong database.');
  process.exit(0);
}

main();
