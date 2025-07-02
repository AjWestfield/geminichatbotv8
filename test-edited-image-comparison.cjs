#!/usr/bin/env node

// Test script to verify edited image comparison fix
// Run with: node test-edited-image-comparison.cjs

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_API_KEY
);

async function testEditedImageComparison() {
  console.log('🧪 Testing edited image comparison fix...\n');

  try {
    // Test the new function
    console.log('1. Testing get_chat_images_with_originals function...');
    
    // First, find a chat that has edited images
    const { data: editedImages, error: editedError } = await supabase
      .from('images')
      .select('chat_id, id, original_image_id')
      .not('original_image_id', 'is', null)
      .limit(1);

    if (editedError) {
      console.log('❌ Error finding edited images:', editedError.message);
      return;
    }

    if (!editedImages || editedImages.length === 0) {
      console.log('⚠️  No edited images found in database');
      console.log('   Create some edited images first, then run this test again');
      return;
    }

    const testChatId = editedImages[0].chat_id;
    const editedImageId = editedImages[0].id;
    const originalImageId = editedImages[0].original_image_id;

    console.log('   Found edited image:', editedImageId);
    console.log('   Original image ID:', originalImageId);
    console.log('   In chat:', testChatId);

    // Test the function
    const { data: imagesWithOriginals, error: funcError } = await supabase
      .rpc('get_chat_images_with_originals', { p_chat_id: testChatId });

    if (funcError) {
      console.log('❌ Function error:', funcError.message);
      console.log('   You need to run fix-edited-image-comparison.sql first!');
      return;
    }

    console.log('\n2. Function results:');
    console.log('   Total images returned:', imagesWithOriginals.length);
    
    const hasEditedImage = imagesWithOriginals.some(img => img.id === editedImageId);
    const hasOriginalImage = imagesWithOriginals.some(img => img.id === originalImageId);

    console.log('   Contains edited image:', hasEditedImage ? '✅' : '❌');
    console.log('   Contains original image:', hasOriginalImage ? '✅' : '❌');

    if (hasEditedImage && hasOriginalImage) {
      console.log('\n✅ Success! The comparison modal should now work for this chat.');
      console.log('   Chat ID to test:', testChatId);
      console.log('\n📝 Next steps:');
      console.log('   1. Restart your dev server');
      console.log('   2. Load the chat with ID:', testChatId);
      console.log('   3. Click on an edited image');
      console.log('   4. The comparison modal should show both images!');
    } else {
      console.log('\n❌ Issue detected - original image not included');
      console.log('   Please check the SQL function implementation');
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testEditedImageComparison();
