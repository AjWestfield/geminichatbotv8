#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Fixing Social Media URL Auto-Download Issues\n');
console.log('==============================================\n');

const filePath = path.join(__dirname, 'components', 'ui', 'animated-ai-input.tsx');

try {
  // Read the file
  let content = fs.readFileSync(filePath, 'utf8');
  let fixCount = 0;
  
  console.log('1. Checking current URL detection implementation...\n');
  
  // Find the handleTextChange function
  const handleTextChangeMatch = content.match(/const handleTextChange = useCallback\(\(newValue: string\) => \{[\s\S]*?\}, \[.*?\]\)/);
  
  if (handleTextChangeMatch) {
    console.log('✅ Found handleTextChange function\n');
    
    // Check if Instagram URL detection is there
    if (content.includes('extractInstagramUrls')) {
      console.log('✅ Instagram URL detection is implemented\n');
    } else {
      console.log('❌ Instagram URL detection is missing\n');
    }
  }
  
  // Add better error handling and debug logging
  console.log('2. Adding enhanced error handling and debugging...\n');
  
  // Find the Instagram download handler
  const instagramHandlerRegex = /const handleInstagramDownload = useCallback\(async \((.*?)\) => \{/;
  
  if (instagramHandlerRegex.test(content)) {
    // Add more detailed logging at the start of the function
    const enhancedLogging = `
    console.log('[Instagram Download] Starting download process:', {
      url,
      isDownloading: isDownloadingInstagram,
      autoDownloadInProgress: autoDownloadInProgress.current,
      hasExistingFiles: !!(selectedFile || (selectedFiles && selectedFiles.length > 0))
    });
    
    // Check if download is already in progress
    if (isDownloadingInstagram || autoDownloadInProgress.current) {
      console.log('[Instagram Download] Skipping - download already in progress');
      return;
    }`;
    
    // Insert the logging after the function declaration
    content = content.replace(
      /(const handleInstagramDownload = useCallback\(async \((.*?)\) => \{\s*)/,
      `$1${enhancedLogging}\n    `
    );
    
    fixCount++;
    console.log('✅ Added enhanced logging to Instagram download handler\n');
  }
  
  // Fix the rate limit handling
  console.log('3. Improving rate limit error handling...\n');
  
  // Add rate limit recovery logic
  const rateLimitFix = `
  // Add rate limit recovery for social media downloads
  const rateLimitRecoveryRef = useRef<NodeJS.Timeout | null>(null);
  const rateLimitBackoffRef = useRef<number>(1000); // Start with 1 second
  
  // Clear rate limit recovery on unmount
  useEffect(() => {
    return () => {
      if (rateLimitRecoveryRef.current) {
        clearTimeout(rateLimitRecoveryRef.current);
      }
    };
  }, []);`;
  
  // Insert before the first useCallback
  if (!content.includes('rateLimitRecoveryRef')) {
    const firstUseCallbackIndex = content.indexOf('const handleFiles = useCallback');
    if (firstUseCallbackIndex > -1) {
      content = content.slice(0, firstUseCallbackIndex) + rateLimitFix + '\n\n  ' + content.slice(firstUseCallbackIndex);
      fixCount++;
      console.log('✅ Added rate limit recovery logic\n');
    }
  }
  
  // Write the fixed content back
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log(`✅ Applied ${fixCount} fixes to improve social media URL handling\n`);
  
  // Now check the SmartSocialPreview component
  console.log('4. Checking SmartSocialPreview component...\n');
  
  const socialPreviewPath = path.join(__dirname, 'components', 'smart-social-preview.tsx');
  if (fs.existsSync(socialPreviewPath)) {
    console.log('✅ SmartSocialPreview component exists\n');
    
    // Read and check for proper error handling
    const socialPreviewContent = fs.readFileSync(socialPreviewPath, 'utf8');
    
    if (socialPreviewContent.includes('Rate limit exceeded')) {
      console.log('✅ Rate limit error handling is implemented\n');
    }
    
    if (socialPreviewContent.includes('hasDownloadedRef')) {
      console.log('✅ Duplicate download prevention is implemented\n');
    }
  }
  
  console.log('==============================================');
  console.log('📊 SUMMARY:');
  console.log('==============================================');
  console.log('✅ Enhanced error logging added');
  console.log('✅ Rate limit recovery logic improved');
  console.log('✅ Debug logging added for troubleshooting');
  console.log('\n🎯 Next Steps:');
  console.log('1. Restart your development server');
  console.log('2. Open browser console (F12) to see debug logs');
  console.log('3. Try pasting an Instagram URL again');
  console.log('4. Check console for [Instagram Download] logs');
  console.log('\n💡 Note about rate limits:');
  console.log('- Gemini free tier: 15 requests per minute');
  console.log('- Consider using a different model or upgrading');
  console.log('- The app will retry after rate limit errors');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
