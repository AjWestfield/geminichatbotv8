// Comprehensive debugging script for image deletion issue
// Run this to understand what's happening

import { createClient } from '@supabase/supabase-js'

// Get these from your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugImageDeletion() {
  console.log('\n🔍 DEBUGGING IMAGE DELETION ISSUE')
  console.log('=====================================\n')

  // 1. Check recent images
  console.log('1. Checking recent images in database...')
  const { data: images, error: imagesError } = await supabase
    .from('images')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (imagesError) {
    console.error('Error fetching images:', imagesError)
    return
  }

  console.log(`Found ${images?.length || 0} recent images:`)
  images?.forEach((img, index) => {
    console.log(`\n  Image ${index + 1}:`)
    console.log(`    ID: ${img.id}`)
    console.log(`    URL: ${img.url?.substring(0, 50)}...`)
    console.log(`    Metadata: ${JSON.stringify(img.metadata)}`)
    console.log(`    Local ID: ${img.metadata?.localId || 'NOT SET'}`)
  })

  // 2. Test deletion with different ID formats
  if (images && images.length > 0) {
    const testImage = images[0]
    console.log('\n2. Testing deletion methods...')
    
    // Test by UUID
    console.log(`\n  Testing delete by UUID: ${testImage.id}`)
    const { data: byUuid, error: uuidError } = await supabase
      .from('images')
      .select('id')
      .eq('id', testImage.id)
      .single()
    
    console.log(`    Found by UUID: ${byUuid ? 'YES' : 'NO'}`)
    if (uuidError) console.log(`    Error: ${uuidError.message}`)

    // Test by local ID
    if (testImage.metadata?.localId) {
      console.log(`\n  Testing delete by local ID: ${testImage.metadata.localId}`)
      
      // Method 1: JSON operator
      const { data: byLocal1, error: local1Error } = await supabase
        .from('images')
        .select('id')
        .eq('metadata->>localId', testImage.metadata.localId)
        .single()
      
      console.log(`    Method 1 (->>) found: ${byLocal1 ? 'YES' : 'NO'}`)
      if (local1Error) console.log(`    Error: ${local1Error.message}`)

      // Method 2: Filter
      const { data: byLocal2, error: local2Error } = await supabase
        .from('images')
        .select('id')
        .filter('metadata->localId', 'eq', `"${testImage.metadata.localId}"`)
        .single()
      
      console.log(`    Method 2 (filter) found: ${byLocal2 ? 'YES' : 'NO'}`)
      if (local2Error) console.log(`    Error: ${local2Error.message}`)

      // Method 3: JSONB contains
      const { data: byLocal3, error: local3Error } = await supabase
        .from('images')
        .select('id')
        .filter('metadata', 'cs', JSON.stringify({ localId: testImage.metadata.localId }))
        .single()
      
      console.log(`    Method 3 (contains) found: ${byLocal3 ? 'YES' : 'NO'}`)
      if (local3Error) console.log(`    Error: ${local3Error.message}`)
    }
  }

  // 3. Check RPC function
  console.log('\n3. Testing RPC function...')
  try {
    const { data: rpcTest, error: rpcError } = await supabase
      .rpc('get_image_by_local_id', { local_id: 'test_id' })
    
    if (rpcError) {
      console.log('  RPC function not available or error:', rpcError.message)
    } else {
      console.log('  RPC function is available')
    }
  } catch (e) {
    console.log('  RPC function error:', e.message)
  }

  // 4. Test actual deletion (with a test image)
  console.log('\n4. Testing actual deletion flow...')
  console.log('  Would you like to test deleting the most recent image? (Check code for manual test)')
  
  // Uncomment to test actual deletion:
  // if (images && images.length > 0) {
  //   const imageToDelete = images[0]
  //   console.log(`  Attempting to delete image: ${imageToDelete.id}`)
  //   
  //   const { error: deleteError } = await supabase
  //     .from('images')
  //     .delete()
  //     .eq('id', imageToDelete.id)
  //   
  //   if (deleteError) {
  //     console.error('  Delete error:', deleteError)
  //   } else {
  //     console.log('  ✅ Image deleted successfully!')
  //   }
  // }
}

// Run the debug
debugImageDeletion().catch(console.error)
