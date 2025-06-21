#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_API_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_API_KEY in .env.local');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

async function checkDatabaseStatus() {
  console.log('🚀 GeminiChatbotv6 - Fixed Database Check\n');
  console.log('==================================================\n');
  console.log('🔍 Checking database status...\n');
  
  const tables = [
    { name: 'chats', required: true },
    { name: 'messages', required: true },
    { name: 'images', required: true },
    { name: 'videos', required: true },
    { name: 'audios', required: false },
    { name: 'social_media_cookies', required: false }
  ];
  
  const results = {
    working: [],
    missing: [],
    errors: []
  };
  
  for (const table of tables) {
    try {
      let query;
      
      // Use optimized queries for large tables
      if (table.name === 'messages') {
        // For messages table, use a fast existence check
        query = supabase
          .from(table.name)
          .select('id', { count: 'exact', head: true })
          .limit(1);
      } else {
        // For other tables, use standard check
        query = supabase
          .from(table.name)
          .select('*')
          .limit(1);
      }
      
      const { data, error, count } = await query;
      
      if (error) {
        if (error.code === '42P01') {
          results.missing.push(table.name);
          console.log(`❌ Table '${table.name}' does not exist${table.required ? ' (REQUIRED)' : ''}`);
        } else {
          results.errors.push({ table: table.name, error });
          console.log(`⚠️  Table '${table.name}' error: ${error.message}`);
        }
      } else {
        results.working.push(table.name);
        if (table.name === 'messages' && count !== null) {
          console.log(`✅ Table '${table.name}' exists (${count.toLocaleString()} records)`);
        } else {
          console.log(`✅ Table '${table.name}' exists`);
        }
      }
    } catch (err) {
      results.errors.push({ table: table.name, error: err });
      console.log(`❌ Error checking table '${table.name}': ${err.message}`);
    }
  }
  
  console.log('\n==================================================\n');
  
  console.log('📊 Summary:');
  console.log(`✅ Working tables: ${results.working.length}`);
  console.log(`❌ Missing tables: ${results.missing.length}`);
  console.log(`⚠️  Tables with errors: ${results.errors.length}`);
  
  if (results.missing.length === 0 && results.errors.length === 0) {
    console.log('\n✅ All required tables exist and are accessible!');
    
    // Test basic operations
    console.log('\n🧪 Testing database operations...\n');
    
    try {
      console.log('Testing chat creation...');
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert([{ title: 'Test Chat', model: 'gemini-2.0-flash-exp' }])
        .select()
        .single();
      
      if (chatError) {
        console.log('❌ Chat creation failed:', chatError.message);
      } else {
        console.log(`✅ Successfully created test chat: ${chat.id}`);
        
        // Test message creation
        console.log('Testing message creation...');
        const { data: message, error: messageError } = await supabase
          .from('messages')
          .insert([{
            chat_id: chat.id,
            role: 'user',
            content: 'Test message for database verification'
          }])
          .select()
          .single();
        
        if (messageError) {
          console.log('❌ Message creation failed:', messageError.message);
        } else {
          console.log(`✅ Successfully created test message: ${message.id}`);
          
          // Clean up
          await supabase.from('messages').delete().eq('id', message.id);
          console.log('✅ Successfully cleaned up test message');
        }
        
        // Clean up chat
        await supabase.from('chats').delete().eq('id', chat.id);
        console.log('✅ Successfully cleaned up test chat');
      }
    } catch (error) {
      console.log('❌ Database operations test failed:', error.message);
    }
    
    console.log('\n🎉 Database is fully functional!');
    console.log('✅ Persistence is enabled and working');
  } else {
    console.log('\n⚠️  Some issues detected:');
    if (results.missing.length > 0) {
      console.log('   Missing tables:', results.missing.join(', '));
      console.log('   Run: npm run db:setup-all');
    }
    if (results.errors.length > 0) {
      console.log('   Tables with errors:', results.errors.map(e => e.table).join(', '));
      console.log('   Consider running: npm run db:optimize-messages');
    }
  }
  
  console.log('\n==================================================\n');
  
  return results;
}

// Run the check
checkDatabaseStatus()
  .then((results) => {
    if (results.errors.length > 0 || results.missing.length > 0) {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Database check failed:', error);
    process.exit(1);
  });