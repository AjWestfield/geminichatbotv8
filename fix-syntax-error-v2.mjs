import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

async function fixPageTsxSyntaxError() {
  const pagePath = join(process.cwd(), 'app', 'page.tsx')
  let content = await readFile(pagePath, 'utf-8')
  
  console.log('🔧 Fixing syntax error in page.tsx...')
  
  // The problem: there's duplicate code starting at line 228
  // We need to remove lines 228-302 which are duplicates
  
  // Split into lines
  const lines = content.split('\n')
  
  // Find the line with the duplicate start (around line 228)
  let duplicateStartIdx = -1
  for (let i = 220; i < 240 && i < lines.length; i++) {
    if (lines[i].includes('})\n') || lines[i] === '    })') {
      // Check if the next line has the duplicate comment
      if (i + 2 < lines.length && lines[i + 2].includes('// Convert database images to proper format')) {
        duplicateStartIdx = i + 1
        break
      }
    }
  }
  
  if (duplicateStartIdx === -1) {
    console.log('Could not find exact duplicate start, using line-based approach...')
    
    // Alternative approach: remove the specific duplicate section
    const duplicateSection = `    })

      // Convert database images to proper format
      // This ensures all metadata fields (including multi-edit fields) are properly mapped
      const formattedDbImages = dbImages.map(convertStoredImageToGenerated);`
    
    const fixedContent = content.replace(duplicateSection, '    }')
    await writeFile(pagePath, fixedContent, 'utf-8')
    console.log('✅ Fixed using pattern replacement!')
    return
  }
  
  // Find where the duplicate ends (before loadPersistedImages() call)
  let duplicateEndIdx = -1
  for (let i = duplicateStartIdx; i < lines.length; i++) {
    if (lines[i].trim() === '}' && i + 1 < lines.length && lines[i + 1].includes('loadPersistedImages()')) {
      duplicateEndIdx = i
      break
    }
  }
  
  if (duplicateEndIdx === -1) {
    console.error('❌ Could not find duplicate end')
    return
  }
  
  console.log(`Removing duplicate lines ${duplicateStartIdx + 1} to ${duplicateEndIdx + 1}`)
  
  // Remove the duplicate lines
  lines.splice(duplicateStartIdx, duplicateEndIdx - duplicateStartIdx + 1)
  
  // Rejoin the lines
  const fixed = lines.join('\n')
  
  await writeFile(pagePath, fixed, 'utf-8')
  console.log('✅ Fixed syntax error in page.tsx!')
  console.log('   The duplicate code has been removed')
}

fixPageTsxSyntaxError().catch(console.error)
