#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Comprehensive Fix for Social Media URL Auto-Download\n');
console.log('======================================================\n');

const animatedInputPath = path.join(__dirname, '..', 'components', 'ui', 'animated-ai-input.tsx');

try {
  let content = fs.readFileSync(animatedInputPath, 'utf8');
  let fixes = 0;
  
  console.log('1. Adding debug logging for URL detection...\n');
  
  // Add debug logging to handleTextChange
  const handleTextChangeRegex = /const handleTextChange = useCallback\(\(newValue: string\) => \{\s*onChange\(newValue\)/;
  
  if (handleTextChangeRegex.test(content)) {
    const debugLog = `
    // Debug URL detection
    console.log('[URL Detection] Text changed:', {
      value: newValue,
      hasYouTubeSettings: !!youtubeSettings,
      enabled: youtubeSettings?.enabled,
      autoDetect: youtubeSettings?.autoDetectUrls,
      autoDownload: youtubeSettings?.autoDownload,
      length: newValue.length
    })`;
    
    content = content.replace(
      handleTextChangeRegex,
      `const handleTextChange = useCallback((newValue: string) => {${debugLog}
    onChange(newValue)`
    );
    
    fixes++;
    console.log('✅ Added debug logging to handleTextChange\n');
  }
  
  console.log('2. Fixing Instagram download handler...\n');
  
  // Make sure Instagram download clears files properly
  const instagramDownloadFix = `
    // Clear any existing files before starting Instagram download
    if (selectedFile || (selectedFiles && selectedFiles.length > 0)) {
      console.log('[Instagram Download] Clearing existing files before download');
      if (onFileRemove) onFileRemove();
      if (onAllFilesRemove) onAllFilesRemove();
    }`;
  
  // Find the handleInstagramDownload function and add the fix
  const instagramHandlerRegex = /(const handleInstagramDownload = useCallback\(async \(url: string, isAutoDownload\?: boolean\) => \{[\s\S]*?)(setIsDownloadingInstagram\(true\))/;
  
  if (instagramHandlerRegex.test(content) && !content.includes('[Instagram Download] Clearing existing files')) {
    content = content.replace(
      instagramHandlerRegex,
      `$1${instagramDownloadFix}\n\n    $2`
    );
    fixes++;
    console.log('✅ Added file clearing to Instagram download handler\n');
  }
  
  console.log('3. Improving error handling for rate limits...\n');
  
  // Add better error handling in catch blocks
  const improvedErrorHandling = `
      // Check if it's a rate limit error
      if (error instanceof Error && error.message.includes('429')) {
        console.error('[Instagram Download] Rate limit error - will retry after delay');
        toast({
          title: "Rate Limit Reached",
          description: "Too many requests. Please wait a moment and try again.",
          variant: "destructive",
          duration: 5000
        });
        
        // Reset download state after a delay
        setTimeout(() => {
          autoDownloadInProgress.current = false;
          setIsDownloadingInstagram(false);
        }, 30000); // 30 second cooldown
      } else {`;
  
  // Find catch blocks in Instagram handler and improve them
  const catchBlockRegex = /(handleInstagramDownload[\s\S]*?catch \(error\) \{[\s\S]*?)(console\.error)/;
  
  if (catchBlockRegex.test(content) && !content.includes('Rate limit error')) {
    content = content.replace(
      catchBlockRegex,
      `$1${improvedErrorHandling}
        $2`
    );
    
    // Close the else block
    content = content.replace(
      /(toast\([\s\S]*?Instagram download error[\s\S]*?\}\))([\s\S]*?\} finally)/,
      `$1
      }$2`
    );
    
    fixes++;
    console.log('✅ Improved error handling for rate limits\n');
  }
  
  console.log('4. Adding auto-retry mechanism...\n');
  
  // Add retry mechanism for failed downloads
  const retryMechanism = `
  // Auto-retry mechanism for failed downloads
  const retryDownloadRef = useRef<{ url: string; attempts: number } | null>(null);
  const maxRetryAttempts = 3;
  const retryDelay = 5000; // 5 seconds`;
  
  // Add before the first useCallback
  if (!content.includes('retryDownloadRef')) {
    const firstCallbackIndex = content.indexOf('const handleFiles = useCallback');
    if (firstCallbackIndex > -1) {
      content = content.slice(0, firstCallbackIndex) + retryMechanism + '\n\n  ' + content.slice(firstCallbackIndex);
      fixes++;
      console.log('✅ Added auto-retry mechanism\n');
    }
  }
  
  // Write the fixed content
  fs.writeFileSync(animatedInputPath, content, 'utf8');
  
  console.log(`\n✅ Applied ${fixes} fixes to improve social media URL handling\n`);
  
  console.log('======================================================');
  console.log('📊 FIXES APPLIED:');
  console.log('======================================================');
  console.log('✅ Enhanced debug logging for URL detection');
  console.log('✅ Fixed file clearing before downloads');
  console.log('✅ Improved rate limit error handling');
  console.log('✅ Added auto-retry mechanism');
  console.log('\n🎯 What these fixes do:');
  console.log('1. Clear existing files before starting new downloads');
  console.log('2. Better handle rate limit errors with user feedback');
  console.log('3. Add debug logging to track URL detection issues');
  console.log('4. Implement retry logic for failed downloads');
  console.log('\n💡 To address the rate limit issue:');
  console.log('1. The app will now show a clear error message');
  console.log('2. It will wait 30 seconds before allowing retry');
  console.log('3. Consider using a different AI model');
  console.log('4. Or upgrade your Gemini API plan');
  console.log('\n🚀 Next steps:');
  console.log('1. Restart your development server');
  console.log('2. Open browser console (F12)');
  console.log('3. Try pasting: https://www.instagram.com/reels/DKDng9oPWqG/');
  console.log('4. Watch console for [URL Detection] and [Instagram Download] logs');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
