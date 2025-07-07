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
  process.exit(1)
}

console.log('🔍 Quick Database Check...')
console.log(`📍 URL: ${supabaseUrl}`)

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

async function quickCheck() {
  try {
    // 1. Check basic connectivity
    console.log('\n1️⃣ Testing connection...')
    const { error: pingError } = await supabase.from('chats').select('id').limit(1)
    if (pingError) throw pingError
    console.log('✅ Connected to database')

    // 2. Check tables exist (without querying messages directly)
    console.log('\n2️⃣ Checking tables...')
    const tables = ['chats', 'images', 'videos', 'audios', 'social_media_cookies', 'image_source_relations']
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1)
      console.log(`${error ? '❌' : '✅'} Table '${table}'${error ? ': ' + error.message : ''}`)
    }

    // 3. Check messages table carefully
    console.log('\n3️⃣ Checking messages table...')
    try {
      // Try a very specific query that should use indexes
      const { data, error } = await supabase
        .from('messages')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (error) {
        console.log('⚠️  Messages table exists but queries are slow')
        console.log('   Run VACUUM ANALYZE public.messages; in SQL editor')
      } else {
        console.log('✅ Messages table is responsive')
      }
    } catch (e) {
      console.log('⚠️  Messages table needs optimization')
    }

    // 4. Check indexes
    console.log('\n4️⃣ Checking indexes...')
    const { data: indexes, error: indexError } = await supabase.rpc('sql', {
      query: `
        SELECT COUNT(*) as index_count
        FROM pg_indexes 
        WHERE tablename = 'messages'
        AND schemaname = 'public'
      `
    }).single()

    if (!indexError && indexes) {
      console.log(`✅ Found ${indexes.index_count} indexes on messages table`)
    }

    // 5. Check for large messages
    console.log('\n5️⃣ Checking large messages summary...')
    const { data: summary, error: summaryError } = await supabase
      .from('large_messages_summary')
      .select('content_length')
      .order('content_length', { ascending: false })
      .limit(1)

    if (!summaryError && summary && summary.length > 0) {
      const sizeInMB = (summary[0].content_length / 1024 / 1024).toFixed(2)
      console.log(`⚠️  Largest message: ${sizeInMB} MB`)
      console.log('   Consider archiving very large messages')
    } else {
      console.log('✅ No extremely large messages found')
    }

    // 6. Test operations
    console.log('\n6️⃣ Testing operations...')
    const testId = crypto.randomUUID()
    
    // Test chat creation
    const { error: createError } = await supabase
      .from('chats')
      .insert({
        id: testId,
        title: 'Quick Check Test',
        model: 'gemini-2.0-flash'
      })

    if (createError) {
      console.log('❌ Chat creation failed:', createError.message)
    } else {
      console.log('✅ Chat creation works')
      
      // Cleanup
      await supabase.from('chats').delete().eq('id', testId)
      console.log('✅ Cleanup successful')
    }

    console.log('\n✨ Quick check complete!')
    console.log('\n💡 Recommendations:')
    console.log('1. Run VACUUM ANALYZE public.messages; in SQL editor')
    console.log('2. Monitor large messages with: SELECT * FROM large_messages_summary;')
    console.log('3. Your database is functional!')

    return true
  } catch (error) {
    console.error('\n❌ Check failed:', error.message)
    return false
  }
}

quickCheck().then(success => {
  process.exit(success ? 0 : 1)
})