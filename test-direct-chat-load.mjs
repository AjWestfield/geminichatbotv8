#!/usr/bin/env node

import { config } from 'dotenv';
// We need to compile TypeScript first, so let's use the API endpoint instead
import fetch from 'node-fetch';

// Load environment variables
config({ path: '.env.local' });

const problematicChatId = '872f2da8-21e9-48f8-bd8d-af70ca7ee180';

async function testDirectChatLoad() {
  console.log('🔍 Testing Direct Chat Load from Database\n');
  
  try {
    console.log('Calling getChat directly...');
    const startTime = Date.now();
    
    const result = await getChat(problematicChatId);
    
    const loadTime = Date.now() - startTime;
    console.log(`\nLoad time: ${loadTime}ms`);
    
    if (!result) {
      console.log('❌ Result is null');
      return;
    }
    
    console.log('\n✅ Chat loaded successfully!');
    console.log('- Chat ID:', result.chat?.id);
    console.log('- Title:', result.chat?.title);
    console.log('- Messages:', result.messages?.length || 0);
    console.log('- Images:', result.images?.length || 0);
    console.log('- Videos:', result.videos?.length || 0);
    
    if (result.messagesPagination) {
      console.log('\nPagination info:');
      console.log('- Total:', result.messagesPagination.total);
      console.log('- Loaded:', result.messagesPagination.loaded);
      console.log('- Has More:', result.messagesPagination.hasMore);
      console.log('- Error:', result.messagesPagination.error);
    }
    
    // Show first few messages
    if (result.messages && result.messages.length > 0) {
      console.log('\nFirst 3 messages:');
      result.messages.slice(0, 3).forEach((msg, i) => {
        console.log(`${i + 1}. ${msg.role}: ${msg.content.substring(0, 50)}...`);
      });
    }
    
    if (result.messagesPagination?.error) {
      console.log('\n⚠️  WARNING: Chat loaded but with pagination error');
      console.log('This means the emergency fallback is working!');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.code === '57014') {
      console.log('\n💡 This is a database timeout error');
      console.log('The database index needs to be created');
    }
  }
}

testDirectChatLoad().catch(console.error);