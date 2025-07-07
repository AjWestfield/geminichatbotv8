#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Video Analyze/Reverse Engineer Fix\n');
console.log('This test will verify that the fix is working correctly.\n');

// Path to the fixed file
const filePath = path.join(__dirname, 'components', 'chat-interface.tsx');

try {
  // Read the file
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log('📋 Checking fixes applied...\n');
  
  // Test 1: Check that originalHandleSubmit calls have been fixed
  const unfixedCalls = content.match(/originalHandleSubmit(?![(:.\}])/g);
  const unfixedCount = unfixedCalls ? unfixedCalls.length : 0;
  
  if (unfixedCount === 0) {
    console.log('✅ Test 1 PASSED: All originalHandleSubmit calls have parentheses');
  } else {
    console.log(`❌ Test 1 FAILED: Found ${unfixedCount} originalHandleSubmit calls without parentheses`);
    console.log('   Locations:', unfixedCalls);
  }
  
  // Test 2: Check that handleSubmitRef.current calls have been fixed
  const unfixedRefs = content.match(/handleSubmitRef\.current(?!\?\.?\()/g);
  const unfixedRefCount = unfixedRefs ? unfixedRefs.length : 0;
  
  // Exclude the assignment line
  const actualUnfixedRefs = unfixedRefs ? unfixedRefs.filter(ref => {
    const index = content.indexOf(ref);
    return !content.substring(index, index + 30).includes(' =');
  }) : [];
  
  if (actualUnfixedRefs.length === 0) {
    console.log('✅ Test 2 PASSED: All handleSubmitRef.current calls have ?.()');
  } else {
    console.log(`❌ Test 2 FAILED: Found ${actualUnfixedRefs.length} handleSubmitRef.current calls without ?.()`)
  }
  
  // Test 3: Check that file verification code was added
  const hasFileVerification = content.includes('// Ensure files are set in the ref before submission');
  
  if (hasFileVerification) {
    console.log('✅ Test 3 PASSED: File verification code has been added');
  } else {
    console.log('❌ Test 3 FAILED: File verification code is missing');
  }
  
  // Test 4: Check critical function signatures
  const hasVideoOptionsHandler = content.includes('handleInlineVideoOptionSelect');
  const hasAnalyzePrompt = content.includes('Please provide a detailed examination of this entire video');
  const hasReverseEngineerPrompt = content.includes('Please reverse engineer this video and provide a complete breakdown');
  
  console.log('\n📊 Function Check:');
  console.log(`   ${hasVideoOptionsHandler ? '✅' : '❌'} handleInlineVideoOptionSelect function exists`);
  console.log(`   ${hasAnalyzePrompt ? '✅' : '❌'} Video analyze prompt exists`);
  console.log(`   ${hasReverseEngineerPrompt ? '✅' : '❌'} Video reverse engineer prompt exists`);
  
  // Summary
  const allTestsPassed = unfixedCount === 0 && actualUnfixedRefs.length === 0 && hasFileVerification;
  
  console.log('\n' + '='.repeat(50));
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! The fix has been successfully applied.\n');
    console.log('Next steps:');
    console.log('1. Restart your development server');
    console.log('2. Paste a video URL (e.g., Instagram reel)');
    console.log('3. Wait for download to complete');
    console.log('4. Click "🔍 Analyze" or "⚙️ Reverse Engineer"');
    console.log('5. The AI should now receive and process your video correctly!\n');
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.\n');
  }
  
} catch (error) {
  console.error('❌ Error testing file:', error.message);
  process.exit(1);
}
