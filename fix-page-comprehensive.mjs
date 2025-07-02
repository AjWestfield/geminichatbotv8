import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

async function fixPageCompletely() {
  const pagePath = join(process.cwd(), 'app', 'page.tsx')
  let content = await readFile(pagePath, 'utf-8')
  
  console.log('🔧 Applying comprehensive fix to page.tsx...')
  
  // First, fix the handleCanvasFileUpload function definition if needed
  if (!content.includes('const handleCanvasFileUpload = async (files: File[]) => {')) {
    content = content.replace(
      /const handleCanvasFileUpload\s*\n\s*console\.log/,
      'const handleCanvasFileUpload = async (files: File[]) => {\n    console.log'
    )
    console.log('✅ Fixed handleCanvasFileUpload function signature')
  }
  
  // Remove the broken dependency line
  content = content.replace(
    /\/\/ Dependencies would be elsewhere.*?\]\)/g,
    ''
  )
  
  // Remove any other malformed dependency arrays
  content = content.replace(
    /}, \[generatedImages, handleGeneratedImagesChange.*?\]\)/g,
    '}'
  )
  
  // Clean up any double closing braces that shouldn't be there
  content = content.replace(/}\s*}\s*\n\s*\/\/ Other code continues here/g, '  }')
  
  // Make sure the function ends properly before the return statement
  // Find where the return statement is and ensure proper structure
  const returnIndex = content.indexOf('return (')
  if (returnIndex > 0) {
    // Get everything before return
    let beforeReturn = content.substring(0, returnIndex)
    let afterReturn = content.substring(returnIndex)
    
    // Count open braces in handleCanvasFileUpload
    const handleCanvasStart = beforeReturn.indexOf('const handleCanvasFileUpload = async (files: File[]) => {')
    if (handleCanvasStart > 0) {
      let functionContent = beforeReturn.substring(handleCanvasStart)
      let braceCount = 0
      let properEnd = -1
      
      for (let i = 0; i < functionContent.length; i++) {
        if (functionContent[i] === '{') braceCount++
        if (functionContent[i] === '}') {
          braceCount--
          if (braceCount === 0) {
            properEnd = handleCanvasStart + i + 1
            break
          }
        }
      }
      
      if (properEnd > 0 && properEnd < returnIndex) {
        // Make sure there's proper spacing between function end and return
        beforeReturn = beforeReturn.substring(0, properEnd) + '\n\n  ' + beforeReturn.substring(properEnd).trim() + '\n\n  '
        content = beforeReturn + afterReturn
      }
    }
  }
  
  await writeFile(pagePath, content, 'utf-8')
  console.log('✅ Comprehensive fix applied to page.tsx!')
  console.log('   The app should now compile correctly.')
}

fixPageCompletely().catch(console.error)
