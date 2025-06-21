#!/usr/bin/env node

/**
 * Script to apply the image thumbnails migration to the database
 * This updates the chat_summaries view to include image thumbnails
 */

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env.local file.');
  console.error('   Required: SUPABASE_URL and SUPABASE_API_KEY (or SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🖼️  Applying image thumbnails migration...\n');

    // Read the SQL file
    const sqlPath = join(__dirname, 'add-image-thumbnails-to-chat-summaries.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');

    // Try to execute using RPC (if available)
    const { error: rpcError } = await supabase.rpc('exec_sql', {
      sql_query: sql
    });

    if (rpcError) {
      console.log('⚠️  Direct SQL execution not available.');
      console.log('📋 Please run the following SQL manually in Supabase SQL Editor:\n');
      console.log('🔗 Dashboard URL: ' + supabaseUrl.replace('/rest/v1', '') + '/sql/new\n');
      console.log('=' .repeat(80));
      console.log(sql);
      console.log('=' .repeat(80));
      console.log('\n✅ After running the SQL:');
      console.log('   1. Your chat tooltips will show image thumbnails');
      console.log('   2. Up to 6 recent images will be displayed per chat');
      console.log('   3. Refresh your application to see the changes');
      return;
    }

    console.log('✅ Successfully updated chat_summaries view!');
    console.log('🖼️  Image thumbnails will now be included in chat summaries.\n');

    // Test the new view
    console.log('📊 Testing the updated view...\n');
    
    const { data: testChats, error: testError } = await supabase
      .from('chat_summaries')
      .select('title, message_count, image_count, image_thumbnails')
      .gt('image_count', 0)
      .limit(3);

    if (!testError && testChats) {
      console.log('📋 Sample chats with images:');
      testChats.forEach(chat => {
        const thumbnailCount = chat.image_thumbnails ? chat.image_thumbnails.length : 0;
        console.log(`\n   • ${chat.title}`);
        console.log(`     Messages: ${chat.message_count}, Images: ${chat.image_count}`);
        console.log(`     Thumbnails loaded: ${thumbnailCount}`);
        
        if (thumbnailCount > 0 && chat.image_thumbnails[0]) {
          console.log(`     First image prompt: "${chat.image_thumbnails[0].prompt?.substring(0, 50)}..."`);
        }
      });
      
      console.log('\n✅ Migration completed successfully!');
      console.log('🔄 Please refresh your application to see image thumbnails in tooltips.');
    } else if (testError) {
      console.error('⚠️  Could not verify migration:', testError.message);
      console.log('   The migration may have succeeded. Please check your application.');
    } else {
      console.log('ℹ️  No chats with images found to test.');
      console.log('✅ Migration completed. Thumbnails will appear when you have chats with images.');
    }

  } catch (error) {
    console.error('❌ Error applying migration:', error);
    console.error('\n💡 Try running the SQL manually in your Supabase dashboard.');
    process.exit(1);
  }
}

// Check if view already has thumbnails
async function checkExistingView() {
  try {
    // Try to query with image_thumbnails column
    const { data, error } = await supabase
      .from('chat_summaries')
      .select('id, image_thumbnails')
      .limit(1);
    
    if (!error) {
      console.log('ℹ️  The image_thumbnails column already exists in the view.');
      console.log('   Checking if it contains data...\n');
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Image Thumbnails Migration Tool\n');
  
  const exists = await checkExistingView();
  
  if (exists) {
    const { data: sampleChat } = await supabase
      .from('chat_summaries')
      .select('title, image_count, image_thumbnails')
      .gt('image_count', 0)
      .limit(1)
      .single();
    
    if (sampleChat && sampleChat.image_thumbnails && sampleChat.image_thumbnails.length > 0) {
      console.log('✅ Thumbnails are already working!');
      console.log(`   Example: "${sampleChat.title}" has ${sampleChat.image_thumbnails.length} thumbnails`);
      return;
    } else {
      console.log('⚠️  Column exists but may need re-indexing.');
      console.log('   Proceeding with migration...\n');
    }
  }
  
  await applyMigration();
}

// Run the script
main().catch(console.error);