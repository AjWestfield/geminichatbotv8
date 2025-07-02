#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDatabaseOptimization() {
  console.log('🔍 Verifying Database Optimization\n');

  // Test 1: Check if indexes exist
  console.log('1. Checking for indexes on messages table...');
  try {
    const { data: indexes, error } = await supabase.rpc('get_table_indexes', { table_name: 'messages' });
    
    if (error) {
      // Try alternative query
      const { data, error: altError } = await supabase
        .from('pg_indexes')
        .select('*')
        .eq('tablename', 'messages');
      
      if (altError) {
        console.log('   ⚠️  Could not check indexes (need to run manually in SQL editor)');
      } else {
        console.log(`   Found ${data?.length || 0} indexes`);
      }
    } else {
      console.log(`   ✅ Found ${indexes?.length || 0} indexes`);
      indexes?.forEach((idx) => {
        console.log(`      - ${idx.indexname}`);
      });
    }
  } catch (err) {
    console.log('   ⚠️  Index check requires manual verification in SQL editor');
  }

  // Test 2: Quick query performance test
  console.log('\n2. Testing query performance...');
  const testChatId = '872f2da8-21e9-48f8-bd8d-af70ca7ee180';
  
  const startTime = Date.now();
  try {
    const { data, error, count } = await supabase
      .from('messages')
      .select('id, role, content, created_at', { count: 'exact' })
      .eq('chat_id', testChatId)
      .order('created_at', { ascending: false })
      .limit(50);

    const queryTime = Date.now() - startTime;

    if (error) {
      console.log(`   ❌ Query failed: ${error.message}`);
    } else {
      console.log(`   ✅ Query completed in ${queryTime}ms`);
      console.log(`   Messages found: ${data?.length || 0}`);
      console.log(`   Total messages in chat: ${count || 'unknown'}`);
      
      if (queryTime > 5000) {
        console.log('   ⚠️  Query is still slow - index may not be created yet');
      } else if (queryTime < 1000) {
        console.log('   🎉 Excellent performance!');
      } else {
        console.log('   ✅ Acceptable performance');
      }
    }
  } catch (err) {
    const queryTime = Date.now() - startTime;
    console.log(`   ❌ Query error after ${queryTime}ms: ${err.message}`);
  }

  // Test 3: Check table statistics
  console.log('\n3. Checking table statistics...');
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true });

    if (!error) {
      console.log(`   ✅ Messages table is accessible`);
    } else {
      console.log(`   ❌ Cannot access messages table: ${error.message}`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log('If queries are still slow:');
  console.log('1. Run the SQL commands manually in Supabase SQL editor');
  console.log('2. Make sure to run each command separately');
  console.log('3. The most important command is:');
  console.log('   CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at_desc');
  console.log('   ON messages(chat_id, created_at DESC);');
  console.log('\n✨ After creating the index, queries should be much faster!');
}

verifyDatabaseOptimization().catch(console.error);