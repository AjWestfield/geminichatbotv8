#!/usr/bin/env node

/**
 * Cleanup script for localStorage corrupted data
 * 
 * This script provides code that users can run in their browser console
 * to clean up any corrupted localStorage data that might be causing
 * JSON parsing errors when switching browser tabs.
 */

console.log(`
================================================================================
localStorage Cleanup Script for Gemini Chatbot v7
================================================================================

If you're experiencing JSON parsing errors when switching browser tabs, 
run the following code in your browser's developer console:

1. Open your browser's Developer Tools (F12 or right-click → Inspect)
2. Go to the Console tab
3. Copy and paste the following code:

--------------------------------------------------------------------------------
`);

const cleanupCode = `
// Cleanup corrupted localStorage data
(function cleanupLocalStorage() {
  console.log('[Cleanup] Starting localStorage cleanup...');
  
  const keysToCheck = [
    'imageGenerationSettings',
    'videoGenerationSettings',
    'chatSettings',
    'chats',
    'messages',
    'gemini-chat-chats'
  ];
  
  // Also check for message keys
  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    if (key.startsWith('gemini-chat-messages-') || key.startsWith('messages-')) {
      keysToCheck.push(key);
    }
  });
  
  let cleanedCount = 0;
  
  keysToCheck.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        // Check if it looks like JSON
        const trimmed = value.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          // Try to parse
          JSON.parse(value);
          console.log(\`✓ \${key}: Valid JSON\`);
        }
      } catch (e) {
        console.warn(\`✗ \${key}: Corrupted data detected, removing...\`);
        localStorage.removeItem(key);
        cleanedCount++;
      }
    }
  });
  
  if (cleanedCount > 0) {
    console.log(\`[Cleanup] Removed \${cleanedCount} corrupted entries\`);
    console.log('[Cleanup] Please refresh the page to apply changes');
  } else {
    console.log('[Cleanup] No corrupted data found!');
  }
  
  console.log('[Cleanup] Complete!');
})();
`;

console.log(cleanupCode);

console.log(`
--------------------------------------------------------------------------------

4. Press Enter to run the code
5. Refresh the page after the cleanup completes

This will remove any corrupted JSON data from localStorage and should fix
the parsing errors when switching tabs.

================================================================================
`);

// Also provide an automated cleanup option when run with Node.js
if (process.argv.includes('--instructions-only')) {
  process.exit(0);
}

console.log(`
To show only the browser console code, run:
  node scripts/clean-localStorage.js --instructions-only
`);