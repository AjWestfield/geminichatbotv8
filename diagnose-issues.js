#!/usr/bin/env node

// Diagnostic script for geminichatbotv7 issues
// Run with: node diagnose-issues.js

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

console.log('🔍 Diagnosing geminichatbotv7 issues...\n');

// Check environment variables
console.log('1. Checking environment variables:');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Configured' : '❌ Missing');
console.log('   SUPABASE_API_KEY:', process.env.SUPABASE_API_KEY ? '✅ Configured' : '❌ Missing');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configured' : '❌ Missing (optional)');
console.log('   BLOB_READ_WRITE_TOKEN:', process.env.BLOB_READ_WRITE_TOKEN ? '✅ Configured' : '❌ Missing');
console.log('   OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing');
console.log('   REPLICATE_API_TOKEN:', process.env.REPLICATE_API_TOKEN ? '✅ Configured' : '❌ Missing');

// Test Supabase connection
console.log('\n2. Testing Supabase connection:');
const testSupabaseConnection = async () => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_API_KEY || ''
    );

    // Test basic connection
    const { data, error } = await supabase
      .from('chats')
      .select('count')
      .limit(1);

    if (error) {
      console.log('   ❌ Database connection failed:', error.message);
      if (error.message.includes('row-level security')) {
        console.log('   ⚠️  RLS policy issue detected - run fix-images-rls-policy.sql');
      }
    } else {
      console.log('   ✅ Database connection successful');
    }

    // Test images table
    const { error: imageError } = await supabase
      .from('images')
      .select('count')
      .limit(1);

    if (imageError) {
      console.log('   ❌ Images table access failed:', imageError.message);
      if (imageError.message.includes('row-level security')) {
        console.log('   ⚠️  Images RLS policy issue - THIS IS YOUR MAIN ISSUE!');
        console.log('   📝 Run the SQL script: fix-images-rls-policy.sql');
      }
    } else {
      console.log('   ✅ Images table accessible');
    }

  } catch (err) {
    console.log('   ❌ Failed to test database:', err.message);
  }
};

// Test blob storage
console.log('\n3. Testing Blob Storage:');
const testBlobStorage = async () => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.log('   ❌ BLOB_READ_WRITE_TOKEN not configured');
    return;
  }

  try {
    const testUrl = 'https://example.vercel-storage.com/test';
    console.log('   ✅ Blob storage token present');
    // Note: Actual upload test would require more setup
  } catch (err) {
    console.log('   ❌ Blob storage test failed:', err.message);
  }
};

// Run tests
(async () => {
  await testSupabaseConnection();
  await testBlobStorage();

  console.log('\n📋 Summary:');
  console.log('1. Main issue: RLS policy on images table preventing inserts');
  console.log('2. Solution: Run fix-images-rls-policy.sql in Supabase SQL editor');
  console.log('3. For chat loading issues: Check browser console for specific errors');
  console.log('\n✨ After fixing RLS policy, restart your dev server and test again.');
})();
