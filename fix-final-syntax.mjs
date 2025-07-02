import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

async function fixRemainingParenthesis() {
  const pagePath = join(process.cwd(), 'app', 'page.tsx')
  let content = await readFile(pagePath, 'utf-8')
  
  console.log('🔧 Fixing remaining syntax error (extra parenthesis)...')
  
  // The issue is on line ~228 where there's "    })" instead of "    }"
  // This is closing the loadPersistedImages function
  
  // Replace the incorrect closing
  content = content.replace(
    /(\s*}\s*\n\s*}\s*\n\s*}\s*\n\s*}\)\s*\n\s*loadPersistedImages\(\))/,
    `
      }
    }
    loadPersistedImages()`
  )
  
  // If that didn't work, try a more specific replacement
  if (content.includes('    })\n    loadPersistedImages()')) {
    content = content.replace('    })\n    loadPersistedImages()', '    }\n    loadPersistedImages()')
    console.log('✅ Fixed extra parenthesis using specific pattern')
  }
  
  await writeFile(pagePath, content, 'utf-8')
  console.log('✅ Syntax should now be correct!')
}

fixRemainingParenthesis().catch(console.error)
