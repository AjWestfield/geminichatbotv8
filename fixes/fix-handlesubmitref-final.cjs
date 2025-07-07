#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the chat-interface.tsx file
const filePath = path.join(__dirname, '..', 'components', 'chat-interface.tsx');

console.log('🔧 Final comprehensive fix for handleSubmitRef.current calls...\n');

try {
  // Read the file
  let content = fs.readFileSync(filePath, 'utf8');
  let totalFixes = 0;
  
  // First, let's find all occurrences to understand the pattern
  const lines = content.split('\n');
  const problematicLines = [];
  
  lines.forEach((line, index) => {
    // Find lines that have handleSubmitRef.current but not followed by ?.() or = 
    if (line.includes('handleSubmitRef.current') && 
        !line.includes('handleSubmitRef.current?.()') && 
        !line.includes('handleSubmitRef.current =') &&
        !line.includes('handleSubmitRef.current?.() =')) {
      problematicLines.push({ lineNumber: index + 1, content: line.trim() });
    }
  });
  
  console.log(`Found ${problematicLines.length} lines with handleSubmitRef.current that need fixing:\n`);
  problematicLines.forEach(({ lineNumber, content }) => {
    console.log(`   Line ${lineNumber}: ${content}`);
  });
  
  if (problematicLines.length > 0) {
    console.log('\nApplying fixes...\n');
    
    // Now fix each line
    lines.forEach((line, index) => {
      if (line.includes('handleSubmitRef.current') && 
          !line.includes('handleSubmitRef.current?.()') && 
          !line.includes('handleSubmitRef.current =') &&
          !line.includes('handleSubmitRef.current?.() =')) {
        
        // Replace handleSubmitRef.current with handleSubmitRef.current?.()
        // Handle cases where it might be at the end of line or followed by whitespace/comment
        lines[index] = line.replace(/handleSubmitRef\.current(?![\w\.\?\(])/g, 'handleSubmitRef.current?.()');
        totalFixes++;
      }
    });
    
    // Rejoin the lines
    content = lines.join('\n');
    
    // Write the fixed content back
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log(`✅ Fixed ${totalFixes} occurrences of handleSubmitRef.current\n`);
  } else {
    console.log('✅ No fixes needed - all handleSubmitRef.current calls are already correct!\n');
  }
  
  // Also verify the assignment line is correct
  if (content.includes('handleSubmitRef.current = handleSubmit')) {
    console.log('✅ handleSubmitRef assignment is correct\n');
  } else {
    console.log('⚠️  Warning: handleSubmitRef assignment might be incorrect\n');
  }
  
  console.log('🎉 Final fix complete! Restart your development server to test.\n');
  
} catch (error) {
  console.error('❌ Error fixing file:', error.message);
  process.exit(1);
}
