import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_API_KEY || ''
);

console.log('🔍 Testing database performance...\n');

async function testDatabaseSpeed() {
  // Test 1: Check if indexes exist
  console.log('1. Checking for optimized indexes...');
  const { data: indexes } = await supabase
    .rpc('get_indexes', { table_name: 'messages' })
    .catch(() => ({ data: null }));
    
  if (!indexes) {
    // Fallback query
    const start1 = Date.now();
    const { data, error } = await supabase
      .from('messages')
      .select('id')
      .limit(1);
    const time1 = Date.now() - start1;
    console.log(`   Simple query time: ${time1}ms`);
  }

  // Test 2: Test message query performance
  console.log('\n2. Testing message query performance...');
  const start2 = Date.now();
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  const time2 = Date.now() - start2;
  
  console.log(`   Message query time: ${time2}ms`);
  if (time2 > 3000) {
    console.log('   ❌ SLOW - Database optimization may not be applied');
  } else if (time2 > 1000) {
    console.log('   ⚠️  Moderate - Could be improved');
  } else {
    console.log('   ✅ Fast - Optimization is working');
  }

  // Test 3: Check if materialized view exists
  console.log('\n3. Checking for materialized view...');
  const { data: chats, error: chatError } = await supabase
    .from('chat_summaries_fast')
    .select('*')
    .limit(1)
    .catch(() => ({ data: null, error: 'View not found' }));
    
  if (chatError) {
    console.log('   ❌ Materialized view not found - optimization not applied');
  } else {
    console.log('   ✅ Materialized view exists');
  }

  console.log('\n📊 Summary:');
  if (time2 > 3000) {
    console.log('   The database optimization was NOT applied properly.');
    console.log('   Please run the SQL scripts in Supabase SQL Editor.');
  } else {
    console.log('   Database is responding well.');
    console.log('   If still slow, the issue may be:');
    console.log('   - Running in development mode');
    console.log('   - Browser cache issues');
    console.log('   - Network latency');
  }
}

testDatabaseSpeed().catch(console.error);
