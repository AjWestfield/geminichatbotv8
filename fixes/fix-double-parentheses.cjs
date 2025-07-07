#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the chat-interface.tsx file
const filePath = path.join(__dirname, '..', 'components', 'chat-interface.tsx');

console.log('🔧 Fixing double parentheses issue...\n');

try {
  // Read the file
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix double parentheses: ?.()() -> ?.()
  const doubleParenMatches = content.match(/\?\.\(\)\(\)/g);
  const doubleParenCount = doubleParenMatches ? doubleParenMatches.length : 0;
  
  console.log(`Found ${doubleParenCount} instances of double parentheses ?.()()\\n`);
  
  if (doubleParenCount > 0) {
    content = content.replace(/\?\.\(\)\(\)/g, '?.()');
    console.log('✅ Fixed all double parentheses\n');
  }
  
  // Also check for and fix originalHandleSubmit()() double calls
  const origDoubleMatches = content.match(/originalHandleSubmit\(\)\(\)/g);
  const origDoubleCount = origDoubleMatches ? origDoubleMatches.length : 0;
  
  if (origDoubleCount > 0) {
    console.log(`Found ${origDoubleCount} instances of originalHandleSubmit()()\\n`);
    content = content.replace(/originalHandleSubmit\(\)\(\)/g, 'originalHandleSubmit()');
    console.log('✅ Fixed all originalHandleSubmit double calls\n');
  }
  
  // Write the fixed content back
  fs.writeFileSync(filePath, content, 'utf8');
  
  const totalFixes = doubleParenCount + origDoubleCount;
  
  if (totalFixes > 0) {
    console.log(`✅ Total fixes applied: ${totalFixes}`);
    console.log('\n🎉 Double parentheses issue fixed!');
  } else {
    console.log('✅ No double parentheses issues found!');
  }
  
  console.log('\n⚠️  IMPORTANT: Restart your development server for changes to take effect!');
  
} catch (error) {
  console.error('❌ Error fixing file:', error.message);
  process.exit(1);
}
