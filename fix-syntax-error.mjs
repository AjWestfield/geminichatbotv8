import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

async function fixPageTsxSyntaxError() {
  const pagePath = join(process.cwd(), 'app', 'page.tsx')
  let content = await readFile(pagePath, 'utf-8')
  
  console.log('🔧 Fixing syntax error in page.tsx...')
  
  // Find the start of the loadPersistedImages function
  const functionStart = content.indexOf('const loadPersistedImages = async () => {')
  if (functionStart === -1) {
    console.error('❌ Could not find loadPersistedImages function')
    return
  }
  
  // Find the duplicate code starting from line 228
  const duplicateStart = content.indexOf('    })\n\n      // Convert database images to proper format')
  if (duplicateStart === -1) {
    console.error('❌ Could not find duplicate code section')
    return
  }
  
  // Find the end of the function (the call to loadPersistedImages())
  const functionCallEnd = content.indexOf('loadPersistedImages()\n  }, [loadAllImages])')
  if (functionCallEnd === -1) {
    console.error('❌ Could not find function call end')
    return
  }
  
  // Extract the good part of the function (before the duplicate)
  const beforeDuplicate = content.substring(0, duplicateStart + 5) // Include the closing })
  
  // Extract the part after the duplicate, starting from the function call
  const afterDuplicate = content.substring(content.lastIndexOf('    loadPersistedImages()'))
  
  // Reconstruct the file
  const fixed = beforeDuplicate + '\n' + afterDuplicate
  
  await writeFile(pagePath, fixed, 'utf-8')
  console.log('✅ Fixed syntax error in page.tsx!')
  console.log('   The loadPersistedImages function is now properly formatted')
}

fixPageTsxSyntaxError().catch(console.error)
