#!/usr/bin/env node

// Debug script for chat loading issues
// Run with: node debug-chat-loading.cjs

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_API_KEY
);

async function debugChatLoading() {
  console.log('🔍 Debugging chat loading issues...\n');

  try {
    // 1. Test if the new function exists
    console.log('1. Testing if get_chat_images_with_originals function exists...');
    const { data: funcTest, error: funcError } = await supabase
      .rpc('get_chat_images_with_originals', { p_chat_id: '00000000-0000-0000-0000-000000000000' });

    if (funcError && funcError.code === '42883') {
      console.log('❌ Function does not exist!');
      console.log('   You need to run the SQL script first.');
      return;
    } else if (funcError) {
      console.log('⚠️  Function exists but returned error:', funcError.message);
    } else {
      console.log('✅ Function exists and is callable');
    }

    // 2. Get a sample chat to test
    console.log('\n2. Finding a chat to test...');
    const { data: chats, error: chatError } = await supabase
      .from('chats')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (chatError || !chats || chats.length === 0) {
      console.log('❌ No chats found to test');
      return;
    }

    const testChatId = chats[0].id;
    console.log('   Found chat:', chats[0].title);
    console.log('   Chat ID:', testChatId);

    // 3. Test loading images the old way
    console.log('\n3. Testing regular image query...');
    const { data: regularImages, error: regularError } = await supabase
      .from('images')
      .select('*')
      .eq('chat_id', testChatId)
      .limit(5);

    if (regularError) {
      console.log('❌ Regular image query failed:', regularError.message);
    } else {
      console.log('✅ Regular query returned', regularImages?.length || 0, 'images');
    }

    // 4. Test the new function
    console.log('\n4. Testing new function with same chat...');
    const { data: enhancedImages, error: enhancedError } = await supabase
      .rpc('get_chat_images_with_originals', { p_chat_id: testChatId });

    if (enhancedError) {
      console.log('❌ Enhanced query failed:', enhancedError.message);
      console.log('   Error details:', enhancedError);
    } else {
      console.log('✅ Enhanced query returned', enhancedImages?.length || 0, 'images');
      
      // Check for the special flag
      const hasSpecialFlag = enhancedImages?.some(img => 
        img.hasOwnProperty('is_original_for_edit')
      );
      console.log('   Has is_original_for_edit flag:', hasSpecialFlag ? 'Yes' : 'No');
    }

    // 5. Test messages loading
    console.log('\n5. Testing message loading...');
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id, role, created_at')
      .eq('chat_id', testChatId)
      .limit(5);

    if (msgError) {
      console.log('❌ Message query failed:', msgError.message);
    } else {
      console.log('✅ Message query returned', messages?.length || 0, 'messages');
    }

    console.log('\n📋 Summary:');
    console.log('If the enhanced query is failing, we need to fix the function.');
    console.log('If regular queries work but enhanced fails, use fallback logic.');

  } catch (error) {
    console.log('❌ Debug script error:', error.message);
  }
}

debugChatLoading();
