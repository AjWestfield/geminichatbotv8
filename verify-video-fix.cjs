#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🔍 Video Fix Verification Script');
console.log('=================================\n');

// Check syntax fixes
function checkSyntaxFixes() {
  console.log('1. Checking syntax fixes in chat-interface.tsx...');
  
  const filePath = path.join(__dirname, 'components', 'chat-interface.tsx');
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for problematic patterns
  const issues = [];
  
  // Check for originalHandleSubmit() in destructuring
  if (content.includes('handleSubmit: originalHandleSubmit()')) {
    issues.push('❌ Found originalHandleSubmit() in destructuring (should be without parentheses)');
  }
  
  // Check for originalHandleSubmit() in dependency arrays
  const depArrayIssues = (content.match(/originalHandleSubmit\(\),/g) || []).length;
  if (depArrayIssues > 0) {
    issues.push(`❌ Found ${depArrayIssues} instances of originalHandleSubmit() in dependency arrays`);
  }
  
  // Check for handleSubmitRef.current without ?.()
  const lines = content.split('\n');
  let submitRefIssues = 0;
  lines.forEach((line, i) => {
    if (line.includes('handleSubmitRef.current') && 
        !line.includes('handleSubmitRef.current?.()') && 
        !line.includes('handleSubmitRef.current =') &&
        !line.includes('handleSubmitRef.current?.() =')) {
      submitRefIssues++;
    }
  });
  
  if (submitRefIssues > 0) {
    issues.push(`❌ Found ${submitRefIssues} instances of handleSubmitRef.current without ?.()`);
  }
  
  if (issues.length === 0) {
    console.log('✅ All syntax fixes are correctly applied\n');
    return true;
  } else {
    console.log('Issues found:');
    issues.forEach(issue => console.log('  ' + issue));
    console.log('');
    return false;
  }
}

// Check if app is running
function checkAppRunning() {
  return new Promise((resolve) => {
    console.log('2. Checking if app is running on http://localhost:3000...');
    
    http.get('http://localhost:3000', (res) => {
      if (res.statusCode === 200 || res.statusCode === 304) {
        console.log('✅ App is running\n');
        resolve(true);
      } else {
        console.log(`⚠️  App returned status code: ${res.statusCode}\n`);
        resolve(false);
      }
    }).on('error', (err) => {
      console.log('❌ App is not running:', err.message);
      console.log('   Please start the dev server with: npm run dev\n');
      resolve(false);
    });
  });
}

// Check for required functions
function checkRequiredFunctions() {
  console.log('3. Checking for required video handling functions...');
  
  const filePath = path.join(__dirname, 'components', 'chat-interface.tsx');
  const content = fs.readFileSync(filePath, 'utf8');
  
  const requiredFunctions = [
    'handleInlineVideoOptionSelect',
    'handleSubmit',
    'nextMessageFilesRef',
    'pendingAttachmentRef'
  ];
  
  const missing = [];
  requiredFunctions.forEach(func => {
    if (!content.includes(func)) {
      missing.push(func);
    }
  });
  
  if (missing.length === 0) {
    console.log('✅ All required functions are present\n');
    return true;
  } else {
    console.log('❌ Missing functions:', missing.join(', '));
    console.log('');
    return false;
  }
}

// Main verification
async function verify() {
  console.log('Running verification checks...\n');
  
  const syntaxOk = checkSyntaxFixes();
  const appRunning = await checkAppRunning();
  const functionsOk = checkRequiredFunctions();
  
  console.log('=================================');
  console.log('📊 VERIFICATION SUMMARY:');
  console.log('=================================');
  console.log(`Syntax fixes:      ${syntaxOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`App running:       ${appRunning ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Required functions: ${functionsOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  
  if (syntaxOk && appRunning && functionsOk) {
    console.log('✅ All checks passed! The video fix should be working.');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Open the manual test page that was just opened in your browser');
    console.log('2. Follow the step-by-step test instructions');
    console.log('3. Test both Analyze and Reverse Engineer functions');
    console.log('');
    console.log('Test URL: https://www.instagram.com/reels/DKDng9oPWqG/');
  } else {
    console.log('❌ Some checks failed. Please review the issues above.');
    
    if (!appRunning) {
      console.log('\n⚠️  The app must be running to test the fix.');
      console.log('Start it with: npm run dev or ./start.sh');
    }
    
    if (!syntaxOk) {
      console.log('\n⚠️  Syntax issues detected. You may need to:');
      console.log('1. Re-run the fix scripts');
      console.log('2. Restart the development server');
    }
  }
}

// Run verification
verify().catch(console.error);
