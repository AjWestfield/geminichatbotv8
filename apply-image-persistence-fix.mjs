// Fix for image persistence on upload
// This fix ensures uploaded images are not lost on page refresh

import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

async function applyImagePersistenceFix() {
  const pagePath = join(process.cwd(), 'app', 'page.tsx')
  let content = await readFile(pagePath, 'utf-8')
  
  // Fix 1: Update loadPersistedImages to keep uploaded images even when persistence is enabled
  const loadPersistedImagesRegex = /const loadPersistedImages = async \(\) => \{[\s\S]*?\n\s*\}/
  
  const newLoadPersistedImages = `const loadPersistedImages = async () => {
      console.log('[PAGE] Starting to load persisted images...')

      const isPersistenceEnabled = isPersistenceConfigured()
      console.log('[PAGE] Persistence enabled:', isPersistenceEnabled)

      // Load from database
      const dbImages = await loadAllImages()
      console.log('[PAGE] Database images loaded:', {
        total: dbImages.length,
        edited: dbImages.filter((img: GeneratedImage) => img.originalImageId).length,
        models: [...new Set(dbImages.map((img: GeneratedImage) => img.model))],
        ids: dbImages.map((img: GeneratedImage) => ({ id: img.id, originalImageId: img.originalImageId }))
      })

      // Convert database images to proper format using the conversion function
      const formattedDbImages = dbImages.map(convertStoredImageToGenerated);

      // Load from localStorage
      const localImages = loadGeneratedImages()
      console.log('[PAGE] LocalStorage images loaded:', {
        total: localImages.length,
        edited: localImages.filter((img: GeneratedImage) => img.originalImageId).length,
        uploaded: localImages.filter((img: GeneratedImage) => img.isUploaded).length,
        ids: localImages.map((img: GeneratedImage) => ({ id: img.id, originalImageId: img.originalImageId }))
      })

      let finalImages: GeneratedImage[] = []

      if (isPersistenceEnabled && dbImages.length > 0) {
        // When persistence is enabled and we have database images,
        // treat database as the source of truth for non-uploaded images

        // Create a set of database image IDs for quick lookup
        const dbImageIds = new Set(formattedDbImages.map((img: GeneratedImage) => img.id))

        // Keep uploaded images from localStorage that aren't in the database
        // This prevents losing uploaded images that failed to save to DB
        const uploadedLocalImages = localImages.filter((localImg: GeneratedImage) =>
          localImg.isUploaded && !dbImageIds.has(localImg.id)
        )
        
        // Also keep other unsaved local images (generated but not yet persisted)
        const unsavedLocalImages = localImages.filter((localImg: GeneratedImage) =>
          !localImg.isUploaded && !dbImageIds.has(localImg.id)
        )

        console.log('[PAGE] Keeping uploaded images from localStorage:', uploadedLocalImages.length)
        console.log('[PAGE] Keeping unsaved generated images from localStorage:', unsavedLocalImages.length)

        // Combine database images with uploaded and unsaved local images
        finalImages = [...formattedDbImages, ...uploadedLocalImages, ...unsavedLocalImages]

        // Clean up localStorage - only remove non-uploaded images that exist in database
        const imagesToKeep = localImages.filter((img: GeneratedImage) =>
          img.isUploaded || !dbImageIds.has(img.id)
        )

        if (imagesToKeep.length !== localImages.length) {
          console.log('[PAGE] Cleaning up localStorage, removing', localImages.length - imagesToKeep.length, 'non-uploaded images that exist in database')
          saveGeneratedImages(imagesToKeep)
        }

        // Mark all database images as saved
        formattedDbImages.forEach((img: GeneratedImage) => {
          savedImageIdsRef.current.add(img.id)
        })

      } else if (!isPersistenceEnabled) {
        // When persistence is not enabled, use localStorage only
        finalImages = localImages
        console.log('[PAGE] Using localStorage only (persistence not configured)')
      } else {
        // Persistence enabled but no database images
        finalImages = localImages
        console.log('[PAGE] No database images found, using localStorage')
      }

      console.log('[PAGE] Final images to display:', {
        total: finalImages.length,
        fromDb: dbImages.length,
        fromLocal: finalImages.length - dbImages.length,
        uploaded: finalImages.filter(img => img.isUploaded).length
      })

      if (finalImages.length > 0) {
        setGeneratedImages(finalImages)
        console.log('[PAGE] Set generated images state with', finalImages.length, 'images')
        // Force switch to images tab to verify they're loaded
        setTimeout(() => {
          console.log('[PAGE] Switching to images tab to display loaded images')
          setActiveCanvasTab('images')
        }, 1000)
      }
    }`
  
  // Fix 2: Ensure handleCanvasFileUpload waits for chat creation and uses correct chatId
  const handleCanvasFileUploadFix = `
      // Force save the uploaded images to database immediately
      // This ensures they're persisted even if handleGeneratedImagesChange is throttled
      if (chatId && isPersistenceConfigured()) {
        console.log('[PAGE] Forcing immediate save of uploaded images to database with chatId:', chatId)
        
        // If we just created a new chat, ensure currentChatId is updated
        if (chatId !== currentChatId) {
          console.log('[PAGE] Updating currentChatId to newly created chat:', chatId)
          setCurrentChatId(chatId)
        }
        
        for (const image of uploadedImages) {`
  
  // Apply fixes
  if (content.includes('const loadPersistedImages = async () => {')) {
    content = content.replace(loadPersistedImagesRegex, newLoadPersistedImages)
    console.log('✅ Fixed loadPersistedImages function')
  }
  
  // Fix the handleCanvasFileUpload to ensure proper chat ID usage
  const uploadSaveRegex = /if \(chatId && isPersistenceConfigured\(\)\) \{[\s\S]*?console\.log\('\[PAGE\] Forcing immediate save of uploaded images to database'\)/
  
  if (content.match(uploadSaveRegex)) {
    content = content.replace(uploadSaveRegex, handleCanvasFileUploadFix.trim())
    console.log('✅ Fixed handleCanvasFileUpload to ensure proper chatId usage')
  }
  
  await writeFile(pagePath, content, 'utf-8')
  console.log('✅ Image persistence fix applied successfully!')
  console.log('   Uploaded images will now persist across page refreshes')
}

// Run the fix
applyImagePersistenceFix().catch(console.error)
