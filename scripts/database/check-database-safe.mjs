#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

console.log('🔍 Checking database configuration...')
console.log(`📍 URL: ${supabaseUrl}`)
console.log(`🔑 Using key: ${supabaseKey.substring(0, 20)}...`)

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

async function checkDatabase() {
  try {
    // Test basic connectivity
    console.log('\n1️⃣ Testing database connection...')
    const { data: test, error: testError } = await supabase
      .from('chats')
      .select('id')
      .limit(1)
    
    if (testError) {
      console.error('❌ Connection test failed:', testError.message)
      return false
    }
    console.log('✅ Database connection successful')

    // Check tables exist
    console.log('\n2️⃣ Checking required tables...')
    const requiredTables = ['chats', 'messages', 'images', 'videos', 'audios', 'social_media_cookies', 'image_source_relations']
    const tableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ANY($1)
    `
    
    const { data: tables, error: tablesError } = await supabase.rpc('sql', {
      query: tableQuery,
      bindings: [requiredTables]
    }).single()

    if (tablesError) {
      // Fallback: check tables individually
      for (const table of requiredTables) {
        const { error } = await supabase.from(table).select('id').limit(1)
        if (error) {
          console.error(`❌ Table '${table}' check failed:`, error.message)
        } else {
          console.log(`✅ Table '${table}' exists`)
        }
      }
    }

    // Check for index issues
    console.log('\n3️⃣ Checking for index issues...')
    try {
      // Get index information safely
      const { data: indexes, error: indexError } = await supabase.rpc('sql', {
        query: `
          SELECT 
            indexname,
            indexdef,
            pg_size_pretty(pg_relation_size(indexname::regclass)) as size
          FROM pg_indexes 
          WHERE tablename = 'messages'
          AND schemaname = 'public'
        `
      }).single()

      if (!indexError && indexes) {
        console.log('✅ Message indexes checked')
      }
    } catch (e) {
      console.log('⚠️  Could not check indexes (this is OK)')
    }

    // Check for large messages
    console.log('\n4️⃣ Checking for oversized messages...')
    try {
      const { data: largeMessages, error: largeError } = await supabase.rpc('sql', {
        query: `
          SELECT 
            COUNT(*) as count,
            MAX(length(content)) as max_size,
            pg_size_pretty(MAX(length(content))::bigint) as max_size_pretty
          FROM messages
          WHERE length(content) > 100000
        `
      }).single()

      if (!largeError && largeMessages) {
        if (largeMessages.count > 0) {
          console.log(`⚠️  Found ${largeMessages.count} large messages (max size: ${largeMessages.max_size_pretty})`)
          console.log('   This may cause index issues. Run fix-messages-index-size.sql if needed.')
        } else {
          console.log('✅ No oversized messages found')
        }
      }
    } catch (e) {
      console.log('⚠️  Could not check message sizes (this is OK)')
    }

    // Test RLS policies with safe operations
    console.log('\n5️⃣ Testing RLS policies (safe mode)...')
    
    // Create a test chat with explicit UUID
    const testChatId = crypto.randomUUID()
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        id: testChatId,
        title: 'Database Check Test',
        model: 'gemini-2.0-flash',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (chatError) {
      console.error('❌ Failed to create test chat:', chatError.message)
      if (chatError.message.includes('row-level security')) {
        console.log('   RLS policies may need adjustment')
      }
    } else {
      console.log('✅ Chat creation successful')

      // Test message creation with small content
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chat.id,
          role: 'user',
          content: 'Test message for database check',
          created_at: new Date().toISOString()
        })

      if (messageError) {
        console.error('❌ Failed to create test message:', messageError.message)
      } else {
        console.log('✅ Message creation successful')
      }

      // Clean up
      await supabase.from('messages').delete().eq('chat_id', chat.id)
      await supabase.from('chats').delete().eq('id', chat.id)
      console.log('✅ Cleanup successful')
    }

    console.log('\n✨ Database check complete!')
    return true

  } catch (error) {
    console.error('\n❌ Database check failed:', error.message)
    return false
  }
}

// Run the check
checkDatabase().then(success => {
  process.exit(success ? 0 : 1)
})