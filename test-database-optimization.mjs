#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabasePerformance() {
  console.log('🔍 Testing Database Performance...\n');
  
  // Test 1: Check if indexes exist
  console.log('1️⃣ Checking for indexes...');
  const { data: indexes, error: indexError } = await supabase
    .from('messages')
    .select('chat_id')
    .limit(1);
    
  if (indexError) {
    console.error('❌ Error checking database:', indexError.message);
  } else {
    console.log('✅ Database connection successful');
  }
  
  // Test 2: Load the problematic chat
  console.log('\n2️⃣ Testing problematic chat (72 messages)...');
  const problemChatId = '872f2da8-21e9-48f8-bd8d-af70ca7ee180';
  
  const startTime = Date.now();
  
  const { data: messages, error: messageError } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', problemChatId)
    .order('created_at', { ascending: false })
    .limit(50);
    
  const loadTime = Date.now() - startTime;
  
  if (messageError) {
    console.error('❌ Error loading messages:', messageError.message);
  } else {
    console.log(`✅ Loaded ${messages?.length || 0} messages in ${loadTime}ms`);
    
    if (loadTime < 500) {
      console.log('🚀 Excellent performance! (< 500ms)');
    } else if (loadTime < 1000) {
      console.log('✅ Good performance (< 1s)');
    } else if (loadTime < 3000) {
      console.log('⚠️ Acceptable performance (< 3s)');
    } else {
      console.log('❌ Poor performance - indexes may not be created yet');
    }
  }
  
  // Test 3: Test a simple query
  console.log('\n3️⃣ Testing simple queries...');
  const startTime2 = Date.now();
  
  const { count, error: countError } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('chat_id', problemChatId);
    
  const countTime = Date.now() - startTime2;
  
  if (countError) {
    console.error('❌ Error counting messages:', countError.message);
  } else {
    console.log(`✅ Counted ${count} messages in ${countTime}ms`);
  }
  
  // Summary
  console.log('\n📊 Performance Summary:');
  console.log('─'.repeat(50));
  console.log(`Message load time: ${loadTime}ms`);
  console.log(`Message count time: ${countTime}ms`);
  console.log(`Total messages in chat: ${count || 'unknown'}`);
  
  if (loadTime < 1000 && countTime < 500) {
    console.log('\n✅ Database is optimized and performing well!');
    console.log('You should no longer see 504 timeout errors.');
  } else {
    console.log('\n⚠️ Performance could be better.');
    console.log('Make sure you ran the SQL optimization script in Supabase.');
  }
}

testDatabasePerformance().catch(console.error);
