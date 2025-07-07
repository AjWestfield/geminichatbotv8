#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the chat-interface.tsx file
const filePath = path.join(__dirname, '..', 'components', 'chat-interface.tsx');

console.log('🔧 Fixing video analyze/reverse engineer submit issue...\n');

try {
  // Read the file
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Count the number of fixes needed
  const matches = content.match(/handleSubmitRef\.current(?!\?\.?\()/g);
  const fixCount = matches ? matches.length : 0;
  
  console.log(`Found ${fixCount} instances where handleSubmitRef.current is called without parentheses\n`);
  
  if (fixCount > 0) {
    // Fix the issue: add ?.() to all handleSubmitRef.current calls that don't have it
    // This regex matches handleSubmitRef.current that is NOT followed by ?. or (
    content = content.replace(/handleSubmitRef\.current(?!\?\.?\()/g, 'handleSubmitRef.current?.()');
    
    // Also need to handle the assignment line differently
    // Restore the assignment that we might have broken
    content = content.replace(/handleSubmitRef\.current\?\.\(\) =/g, 'handleSubmitRef.current =');
    
    // Write the fixed content back
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log('✅ Fixed all instances! The following changes were made:');
    console.log('   - handleSubmitRef.current → handleSubmitRef.current?.()');
    console.log('\n📝 Summary:');
    console.log(`   - File: ${filePath}`);
    console.log(`   - Fixes applied: ${fixCount}`);
    console.log('\n🎉 The video analyze and reverse engineer functionality should now work properly!');
  } else {
    console.log('✅ No fixes needed - all handleSubmitRef.current calls are already correct!');
  }
  
} catch (error) {
  console.error('❌ Error fixing file:', error.message);
  process.exit(1);
}
