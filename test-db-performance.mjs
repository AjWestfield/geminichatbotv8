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

console.log('🔍 Checking database performance...\n');

// Test 1: Check if indexes exist
async function checkIndexes() {
  console.log('1. Checking indexes...');
  const { data, error } = await supabase.rpc('get_indexes', { table_name: 'messages' });
  
  if (error) {
    console.log('   ❌ Could not check indexes');
  } else {
    console.log('   Found indexes:', data?.length || 0);
  }
}

// Test 2: Time a real query
async function testQuery() {
  console.log('\n2. Testing query performance...');
  const start = Date.now();
  
  const { data, error } = await supabase
    .from('messages')
    .select('id, content, created_at')
    .limit(10);
  
  const duration = Date.now() - start;
  
  if (error) {
    console.log('   ❌ Query failed:', error.message);
  } else {
    console.log(`   ⏱️  Query took: ${duration}ms`);
    if (duration > 1000) {
      console.log('   ❌ SLOW - Database optimization needed!');
    } else {
      console.log('   ✅ Good performance');
    }
  }
}

// Test 3: Count total messages
async function countMessages() {
  console.log('\n3. Checking table size...');
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });
  
  if (!error) {
    console.log(`   Total messages: ${count}`);
    if (count > 10000) {
      console.log('   ⚠️  Large table - indexes are critical!');
    }
  }
}

async function main() {
  await checkIndexes();
  await testQuery();
  await countMessages();
  
  console.log('\n📊 Summary:');
  console.log('If queries take > 1000ms, you MUST run the database optimization in Supabase!');
  process.exit(0);
}

main();
