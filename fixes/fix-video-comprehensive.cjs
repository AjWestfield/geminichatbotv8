#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the chat-interface.tsx file
const filePath = path.join(__dirname, '..', 'components', 'chat-interface.tsx');

console.log('🔧 Comprehensive fix for video analyze/reverse engineer functionality...\n');

try {
  // Read the file
  let content = fs.readFileSync(filePath, 'utf8');
  let fixCount = 0;
  
  // Fix 1: Fix all originalHandleSubmit calls without parentheses
  // This regex matches originalHandleSubmit that is NOT followed by: ( or . or : or }
  const originalHandleSubmitMatches = content.match(/originalHandleSubmit(?![(:.\}])/g);
  const originalHandleSubmitCount = originalHandleSubmitMatches ? originalHandleSubmitMatches.length : 0;
  
  console.log(`Found ${originalHandleSubmitCount} instances where originalHandleSubmit is called without parentheses\n`);
  
  if (originalHandleSubmitCount > 0) {
    // Fix originalHandleSubmit calls
    content = content.replace(/originalHandleSubmit(?![(:.\}])/g, 'originalHandleSubmit()');
    fixCount += originalHandleSubmitCount;
  }
  
  // Fix 2: Add debug logging to verify files are being passed
  // Find the handleInlineVideoOptionSelect function and add logging
  const videoOptionsRegex = /const handleInlineVideoOptionSelect = useCallback\(\(option: 'analyze' \| 'reverse-engineer'\) => \{/;
  if (videoOptionsRegex.test(content)) {
    // Add comprehensive debug logging at the start of the function
    const debugCode = `
    console.log('[InlineVideoOptions] Option selected:', option)
    
    // Debug current file state
    console.log('[InlineVideoOptions] Current file state:', {
      hasSelectedFile: !!selectedFile,
      selectedFileName: selectedFile?.file?.name,
      selectedFileType: selectedFile?.file?.type,
      hasGeminiFile: !!selectedFile?.geminiFile,
      geminiUri: selectedFile?.geminiFile?.uri,
      selectedFilesCount: selectedFiles.length,
      nextMessageFilesRef: nextMessageFilesRef.current
    })
    
    // Ensure files are set in the ref before submission
    if (selectedFile || selectedFiles.length > 0) {
      const allFiles = selectedFile ? [selectedFile, ...selectedFiles] : selectedFiles;
      const filesToSend = allFiles.filter(f => f.geminiFile);
      
      if (filesToSend.length > 0) {
        nextMessageFilesRef.current = {
          fileUri: filesToSend[0]?.geminiFile?.uri,
          fileMimeType: filesToSend[0]?.geminiFile?.mimeType,
          transcription: filesToSend[0]?.transcription,
          multipleFiles: filesToSend.map(file => ({
            uri: file.geminiFile!.uri,
            mimeType: file.geminiFile!.mimeType,
            name: file.file.name,
            transcription: file.transcription
          }))
        };
        console.log('[InlineVideoOptions] Set nextMessageFilesRef:', nextMessageFilesRef.current);
      }
    }`;
    
    // Insert the debug code right after the function declaration
    content = content.replace(
      /const handleInlineVideoOptionSelect = useCallback\(\(option: 'analyze' \| 'reverse-engineer'\) => \{\s*console\.log\('\[InlineVideoOptions\] Option selected:', option\)/,
      `const handleInlineVideoOptionSelect = useCallback((option: 'analyze' | 'reverse-engineer') => {${debugCode}`
    );
    
    console.log('✅ Added file verification and debug logging to handleInlineVideoOptionSelect\n');
    fixCount++;
  }
  
  // Write the fixed content back
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('✅ All fixes applied successfully!\n');
  console.log('📝 Summary:');
  console.log(`   - File: ${filePath}`);
  console.log(`   - Total fixes applied: ${fixCount}`);
  console.log(`   - originalHandleSubmit calls fixed: ${originalHandleSubmitCount}`);
  console.log('   - Added file verification before video analysis submission');
  console.log('\n🎉 The video analyze and reverse engineer functionality should now work properly!');
  console.log('\n⚠️  IMPORTANT: Restart your development server for changes to take effect!');
  
} catch (error) {
  console.error('❌ Error fixing file:', error.message);
  process.exit(1);
}
