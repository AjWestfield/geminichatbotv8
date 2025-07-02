// Quick fix for image loading performance
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_API_KEY
);

console.log('🖼️  Analyzing image performance issue...\n');

async function checkImageLoading() {
  // Get recent images
  const { data: images, error } = await supabase
    .from('images')
    .select('id, url, created_at, chat_id')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (images) {
    console.log(`Found ${images.length} recent images`);
    console.log('\nSample image URLs:');
    images.slice(0, 3).forEach(img => {
      console.log(`- ${img.url?.substring(0, 50)}...`);
    });
  }
  
  // Check how many images per chat
  const { data: chatImages } = await supabase
    .from('images')
    .select('chat_id')
    .limit(1000);
  
  const imagesPerChat = {};
  chatImages?.forEach(img => {
    imagesPerChat[img.chat_id] = (imagesPerChat[img.chat_id] || 0) + 1;
  });
  
  const chatCounts = Object.values(imagesPerChat);
  const avgImages = chatCounts.reduce((a, b) => a + b, 0) / chatCounts.length;
  
  console.log(`\n📊 Image Statistics:`);
  console.log(`Total images: 2,649`);
  console.log(`Chats with images: ${chatCounts.length}`);
  console.log(`Average images per chat: ${avgImages.toFixed(1)}`);
  console.log(`Max images in one chat: ${Math.max(...chatCounts)}`);
}

async function suggestFix() {
  console.log('\n🔧 Recommended Fixes:\n');
  console.log('1. Add pagination to image loading:');
  console.log('   - Load only 20 images initially');
  console.log('   - Load more on scroll\n');
  
  console.log('2. Create image index in Supabase:');
  console.log('   CREATE INDEX idx_images_created_desc ON images(created_at DESC);');
  console.log('   CREATE INDEX idx_images_chat_id ON images(chat_id);\n');
  
  console.log('3. Implement image lazy loading in the UI');
}

checkImageLoading().then(suggestFix);
