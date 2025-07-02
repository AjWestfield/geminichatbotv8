import { NextRequest, NextResponse } from 'next/server'
import { ensurePermanentImageStorage } from '@/lib/storage/permanent-image-storage'
import { getImageByLocalId } from '@/lib/services/chat-persistence'
import { generateImageId } from '@/lib/image-utils'

interface MigrationRequest {
  imageIds?: string[]  // Optional list of specific image IDs to migrate
  checkAll?: boolean   // Check all images in localStorage
  dryRun?: boolean     // Just check without migrating
}

interface MigrationResult {
  imageId: string
  originalUrl: string
  newUrl?: string
  status: 'success' | 'failed' | 'skipped'
  reason?: string
}

export async function POST(req: NextRequest) {
  console.log('[Migrate Images API] Request received')
  
  try {
    const body = await req.json() as MigrationRequest
    const { imageIds = [], checkAll = false, dryRun = false } = body
    
    const results: MigrationResult[] = []
    
    // Get images to process
    let imagesToProcess: Array<{ id: string; url: string }> = []
    
    if (checkAll) {
      // In a real implementation, you would fetch all images from the database
      // For now, we'll just process the provided IDs
      console.log('[Migrate Images API] Check all images requested (not fully implemented)')
    }
    
    // Process specific image IDs
    for (const imageId of imageIds) {
      try {
        // Try to get image from database first
        const dbImage = await getImageByLocalId(imageId)
        if (dbImage?.url) {
          imagesToProcess.push({ id: imageId, url: dbImage.url })
        }
      } catch (error) {
        console.error(`[Migrate Images API] Failed to fetch image ${imageId}:`, error)
        results.push({
          imageId,
          originalUrl: 'unknown',
          status: 'failed',
          reason: 'Failed to fetch image from database'
        })
      }
    }
    
    // Process each image
    for (const image of imagesToProcess) {
      try {
        // Check if migration is needed
        const needsMigration = 
          image.url.includes('replicate.delivery') ||
          image.url.includes('tmp') ||
          (image.url.includes('blob.vercel-storage.com') && dryRun) // Check blob URLs in dry run
        
        if (!needsMigration) {
          results.push({
            imageId: image.id,
            originalUrl: image.url,
            status: 'skipped',
            reason: 'URL appears to be permanent already'
          })
          continue
        }
        
        if (dryRun) {
          // Just check if the URL is still valid
          try {
            const response = await fetch(image.url, { method: 'HEAD' })
            results.push({
              imageId: image.id,
              originalUrl: image.url,
              status: response.ok ? 'skipped' : 'failed',
              reason: response.ok ? 'URL is still valid' : `HTTP ${response.status}`
            })
          } catch (error) {
            results.push({
              imageId: image.id,
              originalUrl: image.url,
              status: 'failed',
              reason: 'URL is not accessible'
            })
          }
        } else {
          // Perform actual migration
          console.log(`[Migrate Images API] Migrating image ${image.id}...`)
          
          const newUrl = await ensurePermanentImageStorage(image.url, {
            imageId: image.id,
            filename: `migrated_${generateImageId()}_${Date.now()}.png`,
            forceReupload: false
          })
          
          results.push({
            imageId: image.id,
            originalUrl: image.url,
            newUrl,
            status: 'success',
            reason: newUrl !== image.url ? 'Migrated to permanent storage' : 'Already permanent'
          })
          
          console.log(`[Migrate Images API] Successfully migrated image ${image.id}`)
        }
      } catch (error: any) {
        console.error(`[Migrate Images API] Failed to migrate image ${image.id}:`, error)
        results.push({
          imageId: image.id,
          originalUrl: image.url,
          status: 'failed',
          reason: error.message || 'Migration failed'
        })
      }
    }
    
    // Summary statistics
    const summary = {
      total: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length
    }
    
    console.log('[Migrate Images API] Migration complete:', summary)
    
    return NextResponse.json({
      success: true,
      summary,
      results,
      dryRun
    })
    
  } catch (error: any) {
    console.error('[Migrate Images API] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Migration failed'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check migration status
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Image migration endpoint',
    endpoints: {
      POST: {
        description: 'Migrate images to permanent storage',
        body: {
          imageIds: 'Array of image IDs to migrate (optional)',
          checkAll: 'Boolean to check all images (optional)',
          dryRun: 'Boolean to check without migrating (optional)'
        }
      }
    }
  })
}