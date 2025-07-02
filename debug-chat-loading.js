#!/usr/bin/env node

// Debug script to help identify chat loading issues

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugChatLoading() {
  console.log('🔍 Debugging chat loading issues...\n')

  // 1. Test chat_summaries view
  console.log('1. Testing chat_summaries view:')
  try {
    const { data: summaries, error } = await supabase
      .from('chat_summaries')
      .select('*')
      .limit(3)

    if (error) {
      console.error('❌ Error fetching chat_summaries:', error.message)
    } else {
      console.log('✅ Successfully fetched chat_summaries')
      console.log(`   Found ${summaries?.length || 0} chats`)
      
      // Check if image_thumbnails field exists
      if (summaries && summaries.length > 0) {
        const hasImageThumbnails = 'image_thumbnails' in summaries[0]
        console.log(`   image_thumbnails field exists: ${hasImageThumbnails ? '✅ Yes' : '❌ No'}`)
        
        if (hasImageThumbnails) {
          const chatsWithImages = summaries.filter(s => s.image_count > 0)
          console.log(`   Chats with images: ${chatsWithImages.length}`)
          
          chatsWithImages.forEach(chat => {
            const thumbnailCount = chat.image_thumbnails ? chat.image_thumbnails.length : 0
            console.log(`   - "${chat.title}": ${chat.image_count} images, ${thumbnailCount} thumbnails`)
          })
        }
      }
    }
  } catch (err) {
    console.error('❌ Exception:', err.message)
  }

  console.log('\n2. Testing individual chat loading:')
  try {
    // Get a chat ID to test
    const { data: chats } = await supabase
      .from('chats')
      .select('id, title')
      .limit(1)

    if (chats && chats.length > 0) {
      const testChatId = chats[0].id
      console.log(`   Testing chat: "${chats[0].title}" (${testChatId})`)

      // Test loading messages
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', testChatId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (msgError) {
        console.error('❌ Error loading messages:', msgError.message)
      } else {
        console.log(`✅ Successfully loaded ${messages?.length || 0} messages`)
      }

      // Test loading images
      const { data: images, error: imgError } = await supabase
        .from('images')
        .select('id, url, prompt')
        .eq('chat_id', testChatId)
        .limit(6)

      if (imgError) {
        console.error('❌ Error loading images:', imgError.message)
      } else {
        console.log(`✅ Successfully loaded ${images?.length || 0} images`)
      }
    }
  } catch (err) {
    console.error('❌ Exception:', err.message)
  }

  console.log('\n3. Checking for large chats that might timeout:')
  try {
    const { data: largeChatStats } = await supabase
      .from('chat_summaries')
      .select('id, title, message_count')
      .gt('message_count', 100)
      .order('message_count', { ascending: false })
      .limit(5)

    if (largeChatStats && largeChatStats.length > 0) {
      console.log('⚠️  Found chats with many messages:')
      largeChatStats.forEach(chat => {
        console.log(`   - "${chat.title}": ${chat.message_count} messages`)
      })
      console.log('   These chats might experience loading timeouts')
    } else {
      console.log('✅ No extremely large chats found')
    }
  } catch (err) {
    console.error('❌ Exception:', err.message)
  }

  console.log('\n4. Database view status:')
  console.log('   To fix missing image thumbnails, run this SQL in Supabase:')
  console.log('   👉 scripts/database/add-image-thumbnails-to-chat-summaries.sql')
  
  console.log('\n✨ Debug complete!')
}

debugChatLoading().catch(console.error)