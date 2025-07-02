#!/usr/bin/env node

// Test image insertion with the same credentials your app uses
// Run with: node test-image-insert.cjs

const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

console.log('🧪 Testing image insertion with app credentials...\n');

const testImageInsert = async () => {
  // Create client exactly as the app does
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_API_KEY || '', // Using anon key like the app
    {
      db: { schema: 'public' },
      auth: { persistSession: false }
    }
  );

  // Test data similar to what the app would insert
  const testImage = {
    chat_id: '7796fd51-4486-4ba5-ac60-dc17c2aaa522', // From your logs
    url: 'https://test.example.com/test-image.png',
    prompt: 'Test image for RLS policy check',
    model: 'test-model',
    quality: 'hd',
    size: '1024x1024',
    is_uploaded: false,
    metadata: {
      localId: 'test-' + Date.now(),
      timestamp: new Date().toISOString()
    }
  };

  console.log('Attempting to insert test image...');
  
  try {
    const { data, error } = await supabase
      .from('images')
      .insert(testImage)
      .select()
      .single();

    if (error) {
      console.log('\n❌ Insert failed with error:');
      console.log('   Error code:', error.code);
      console.log('   Error message:', error.message);
      console.log('   Error details:', error.details);
      console.log('   Error hint:', error.hint);
      
      if (error.code === '42501') {
        console.log('\n⚠️  This is the RLS policy violation!');
        console.log('📝 You need to run fix-images-rls-policy.sql in Supabase');
      }
    } else {
      console.log('\n✅ Insert successful! Image ID:', data.id);
      
      // Clean up test image
      console.log('Cleaning up test image...');
      const { error: deleteError } = await supabase
        .from('images')
        .delete()
        .eq('id', data.id);
        
      if (deleteError) {
        console.log('⚠️  Could not delete test image:', deleteError.message);
      } else {
        console.log('✅ Test image cleaned up');
      }
    }
  } catch (err) {
    console.log('\n❌ Unexpected error:', err.message);
  }
};

// Run the test
testImageInsert().then(() => {
  console.log('\n✅ Test complete!');
}).catch(err => {
  console.log('\n❌ Test failed:', err);
});
