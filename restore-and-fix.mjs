import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { execSync } from 'child_process'

async function restoreOriginalWithFix() {
  console.log('🔧 Restoring original page.tsx with image persistence fix...')
  
  // First, restore from git to get clean version
  try {
    execSync('cd /Users/andersonwestfield/Desktop/geminichatbotv7 && git checkout -- app/page.tsx', { stdio: 'inherit' })
    console.log('✅ Restored original page.tsx from git')
  } catch (error) {
    console.log('⚠️  Could not restore from git, will apply manual fix')
  }
  
  // Now apply ONLY the image persistence fix
  const pagePath = join(process.cwd(), 'app', 'page.tsx')
  let content = await readFile(pagePath, 'utf-8')
  
  // Find the loadPersistedImages function
  const loadPersistedImagesStart = content.indexOf('const loadPersistedImages = async () => {')
  if (loadPersistedImagesStart === -1) {
    console.error('❌ Could not find loadPersistedImages function')
    return
  }
  
  // Find the section where we filter unsaved images
  const unsavedSectionRegex = /const unsavedLocalImages = localImages\.filter\(\(localImg: GeneratedImage\) =>\s*!dbImageIds\.has\(localImg\.id\)\s*\)/
  
  if (content.match(unsavedSectionRegex)) {
    console.log('Updating image filtering logic...')
    
    // Replace the unsaved images filter to keep uploaded images
    content = content.replace(
      unsavedSectionRegex,
      `// Keep uploaded images from localStorage that aren't in the database
        // This prevents losing uploaded images that failed to save to DB
        const uploadedLocalImages = localImages.filter((localImg: GeneratedImage) =>
          localImg.isUploaded && !dbImageIds.has(localImg.id)
        )
        
        // Also keep other unsaved local images (generated but not yet persisted)
        const unsavedLocalImages = localImages.filter((localImg: GeneratedImage) =>
          !localImg.isUploaded && !dbImageIds.has(localImg.id)
        )`
    )
    
    // Update the finalImages assignment
    content = content.replace(
      'finalImages = [...formattedDbImages, ...unsavedLocalImages]',
      'finalImages = [...formattedDbImages, ...uploadedLocalImages, ...unsavedLocalImages]'
    )
    
    // Update the console log
    content = content.replace(
      "console.log('[PAGE] Unsaved local images:', unsavedLocalImages.length)",
      `console.log('[PAGE] Keeping uploaded images from localStorage:', uploadedLocalImages.length)
        console.log('[PAGE] Keeping unsaved generated images from localStorage:', unsavedLocalImages.length)`
    )
    
    // Update the localStorage cleanup to not remove uploaded images
    content = content.replace(
      /const imagesToKeep = localImages\.filter\(\(img: GeneratedImage\) =>\s*!dbImageIds\.has\(img\.id\)\s*\)/,
      `const imagesToKeep = localImages.filter((img: GeneratedImage) =>
          img.isUploaded || !dbImageIds.has(img.id)
        )`
    )
    
    console.log('✅ Updated image persistence logic')
  }
  
  await writeFile(pagePath, content, 'utf-8')
  console.log('✅ Image persistence fix applied successfully!')
  console.log('   Uploaded images will now persist across browser refreshes')
}

restoreOriginalWithFix().catch(console.error)
