import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

async function fixHandleCanvasFileUpload() {
  const pagePath = join(process.cwd(), 'app', 'page.tsx')
  let content = await readFile(pagePath, 'utf-8')
  
  console.log('🔧 Fixing handleCanvasFileUpload function definition...')
  
  // Fix the function definition
  content = content.replace(
    'const handleCanvasFileUpload\n    console.log',
    'const handleCanvasFileUpload = async (files: File[]) => {\n    console.log'
  )
  
  // Also check if the closing is correct - the function should end with just }
  // Find the line with the dependency array and fix it
  const dependencyArrayRegex = /\s*}\s*\n\s*}, \[generatedImages, handleGeneratedImagesChange/
  const match = content.match(dependencyArrayRegex)
  
  if (match) {
    console.log('Found incorrect closing, fixing...')
    content = content.replace(
      match[0],
      '\n  }\n\n  // Other code continues here...\n\n  // Dependencies would be elsewhere'
    )
  }
  
  // Actually, let's be more specific. The handleCanvasFileUpload should be a proper async function
  // Let's find the exact location and fix it properly
  const lines = content.split('\n')
  let fixedLines = []
  let inHandleCanvasFileUpload = false
  let braceCount = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Check if we're at the function definition
    if (line.includes('const handleCanvasFileUpload') && !line.includes('= async')) {
      fixedLines.push('  const handleCanvasFileUpload = async (files: File[]) => {')
      inHandleCanvasFileUpload = true
      braceCount = 1
      continue
    }
    
    // Track braces if we're in the function
    if (inHandleCanvasFileUpload) {
      // Count braces
      for (const char of line) {
        if (char === '{') braceCount++
        if (char === '}') braceCount--
      }
      
      // Check if we've closed the function
      if (braceCount === 0) {
        inHandleCanvasFileUpload = false
        // Make sure we only have one closing brace
        if (line.trim() === '}') {
          fixedLines.push(line)
          continue
        }
      }
    }
    
    // Remove the incorrect dependency array line if it's right after the function
    if (i > 0 && lines[i-1].trim() === '}' && line.includes('}, [generatedImages, handleGeneratedImagesChange')) {
      console.log('Removing incorrect dependency array at line', i + 1)
      continue
    }
    
    fixedLines.push(line)
  }
  
  const fixed = fixedLines.join('\n')
  
  await writeFile(pagePath, fixed, 'utf-8')
  console.log('✅ Fixed handleCanvasFileUpload function definition!')
}

fixHandleCanvasFileUpload().catch(console.error)
