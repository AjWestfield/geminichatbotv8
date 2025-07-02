#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOptimizationNeeded() {
  console.log('🔍 Checking if database optimization is needed...\n');

  try {
    // Check for existing indexes
    let indexes = null;
    try {
      const result = await supabase.rpc('get_indexes_info', {
        table_name: 'messages'
      });
      indexes = result.data;
    } catch (err) {
      // Function might not exist
      indexes = null;
    }

    // Count messages
    const { count: messageCount, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    // Check for large chats
    let largeChatStats = null;
    try {
      const result = await supabase.rpc('get_chat_message_stats');
      largeChatStats = result.data;
    } catch (err) {
      // Function might not exist
      largeChatStats = null;
    }

    console.log('📊 Database Statistics:');
    console.log(`• Total messages: ${messageCount || 'Unknown'}`);
    
    if (indexes) {
      console.log(`• Indexes on messages table: ${indexes.length}`);
      const hasCompositeIndex = indexes.some(idx => 
        idx.index_name?.includes('chat_id_created_at')
      );
      console.log(`• Has optimized composite index: ${hasCompositeIndex ? '✅ Yes' : '❌ No'}`);
    }

    // Recommendation
    console.log('\n🎯 Recommendation:');
    
    if (messageCount > 10000 || !indexes || indexes.length < 2) {
      console.log('⚠️  Database optimization is RECOMMENDED');
      console.log('   Run: npm run db:optimize-performance');
      console.log('\nReasons:');
      if (messageCount > 10000) {
        console.log('   • You have over 10,000 messages');
      }
      if (!indexes || indexes.length < 2) {
        console.log('   • Missing optimized indexes');
      }
    } else {
      console.log('✅ Database appears to be optimized');
      console.log('   No immediate action needed');
    }

    // Test query performance
    console.log('\n⏱️  Testing query performance...');
    const testChatId = 'test-performance-check';
    const startTime = Date.now();
    
    try {
      const { error: perfError } = await supabase
        .from('messages')
        .select('id, content')
        .eq('chat_id', testChatId)
        .limit(100);
      
      const queryTime = Date.now() - startTime;
      console.log(`   Query completed in ${queryTime}ms`);
      
      if (queryTime > 5000) {
        console.log('   ⚠️  Slow query detected - optimization needed!');
      } else {
        console.log('   ✅ Query performance is acceptable');
      }
    } catch (perfError) {
      console.log('   Could not complete performance test');
    }

  } catch (error) {
    console.error('Error checking database:', error);
    console.log('\n💡 If you\'re experiencing timeout errors, run:');
    console.log('   npm run db:optimize-performance');
  }
}

checkOptimizationNeeded().catch(console.error);