#!/usr/bin/env node
/**
 * Migration script to upload existing Replicate images to permanent blob storage
 * This script finds all images with Replicate URLs and uploads them to Vercel Blob
 * 
 * Usage: npm run migrate:replicate-images
 */

import { createClient } from '@supabase/supabase-js'
import { uploadImageToBlob } from '../lib/storage/blob-storage'
import { validateImageUrl } from '../lib/image-url-validator'
import { generateImageId } from '../lib/image-utils'

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_API_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_API_KEY must be set')
  process.exit(1)
}

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('❌ Error: BLOB_READ_WRITE_TOKEN must be set for blob storage')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface ImageRecord {
  id: string
  url: string
  prompt: string
  created_at: string
  metadata?: any
}

async function migrateReplicateImages() {
  console.log('🚀 Starting Replicate image migration...')
  
  try {
    // Fetch all images with Replicate URLs
    const { data: images, error } = await supabase
      .from('images')
      .select('*')
      .like('url', '%replicate.delivery%')
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('❌ Error fetching images:', error)
      return
    }
    
    if (!images || images.length === 0) {
      console.log('✅ No Replicate images found to migrate')
      return
    }
    
    console.log(`📊 Found ${images.length} Replicate images to process`)
    
    let successCount = 0
    let skipCount = 0
    let errorCount = 0
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i] as ImageRecord
      const progress = `[${i + 1}/${images.length}]`
      
      console.log(`\n${progress} Processing image ${image.id}...`)
      console.log(`  URL: ${image.url.substring(0, 80)}...`)
      console.log(`  Created: ${new Date(image.created_at).toLocaleDateString()}`)
      
      try {
        // Check if URL is still valid
        const isValid = await validateImageUrl(image.url)
        
        if (!isValid) {
          console.log(`  ⚠️  URL has expired, skipping...`)
          skipCount++
          continue
        }
        
        // Generate filename based on image ID
        const filename = `migrated_${image.id}_${generateImageId()}.jpg`
        
        // Upload to blob storage
        console.log(`  📤 Uploading to blob storage...`)
        const permanentUrl = await uploadImageToBlob(image.url, filename)
        
        if (permanentUrl === image.url) {
          console.log(`  ⚠️  Failed to upload (blob storage might not be configured)`)
          errorCount++
          continue
        }
        
        // Update database with permanent URL
        const { error: updateError } = await supabase
          .from('images')
          .update({ 
            url: permanentUrl,
            metadata: {
              ...image.metadata,
              migrated: true,
              migrated_at: new Date().toISOString(),
              original_url: image.url
            }
          })
          .eq('id', image.id)
        
        if (updateError) {
          console.error(`  ❌ Error updating database:`, updateError)
          errorCount++
          continue
        }
        
        console.log(`  ✅ Successfully migrated to: ${permanentUrl.substring(0, 60)}...`)
        successCount++
        
        // Rate limiting - wait 500ms between uploads to avoid overwhelming the API
        if (i < images.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing image:`, error)
        errorCount++
      }
    }
    
    console.log('\n📊 Migration Complete!')
    console.log(`  ✅ Successfully migrated: ${successCount}`)
    console.log(`  ⚠️  Skipped (expired): ${skipCount}`)
    console.log(`  ❌ Errors: ${errorCount}`)
    console.log(`  📁 Total processed: ${images.length}`)
    
  } catch (error) {
    console.error('❌ Fatal error during migration:', error)
    process.exit(1)
  }
}

// Run migration with dry-run option
const isDryRun = process.argv.includes('--dry-run')

if (isDryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be made')
  
  // Just count and display what would be migrated
  supabase
    .from('images')
    .select('id, url, created_at', { count: 'exact' })
    .like('url', '%replicate.delivery%')
    .then(({ data, count, error }) => {
      if (error) {
        console.error('❌ Error:', error)
        return
      }
      
      console.log(`\n📊 Dry run results:`)
      console.log(`  Would process ${count} Replicate images`)
      
      if (data && data.length > 0) {
        console.log(`\n  Sample images that would be migrated:`)
        data.slice(0, 5).forEach(img => {
          console.log(`    - ${img.id} (created ${new Date(img.created_at).toLocaleDateString()})`)
        })
        if (count! > 5) {
          console.log(`    ... and ${count! - 5} more`)
        }
      }
    })
} else {
  // Run the actual migration
  migrateReplicateImages().catch(console.error)
}