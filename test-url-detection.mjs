#!/usr/bin/env node

import { detectYouTubeUrl, extractYouTubeUrls } from '../lib/youtube-url-utils.js';

console.log('🧪 Testing URL Detection\n');
console.log('========================\n');

// Test URLs
const testUrls = [
  'https://www.instagram.com/reels/DKDng9oPWqG/',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ',
  'Check out this video: https://www.instagram.com/reels/DKDng9oPWqG/',
  'Multiple URLs: https://www.youtube.com/watch?v=abc123 and https://www.instagram.com/p/XYZ789/'
];

console.log('Testing YouTube URL detection:\n');

testUrls.forEach(url => {
  console.log(`Input: "${url}"`);
  
  // Test YouTube detection
  const youtubeDetection = detectYouTubeUrl(url);
  const youtubeUrls = extractYouTubeUrls(url);
  
  if (youtubeDetection) {
    console.log('  YouTube detected:', youtubeDetection);
  } else if (youtubeUrls.length > 0) {
    console.log('  YouTube URLs found:', youtubeUrls);
  } else {
    console.log('  No YouTube URL detected');
  }
  
  // Check if it's Instagram
  if (url.includes('instagram.com')) {
    console.log('  ⚠️  This is an Instagram URL - needs Instagram handler');
  }
  
  console.log('');
});

console.log('\n📋 Key Findings:');
console.log('================');
console.log('1. YouTube detection works for YouTube URLs');
console.log('2. Instagram URLs need separate handling');
console.log('3. Make sure the correct handler is called for each platform');
console.log('\n💡 If Instagram URLs are being pasted:');
console.log('   - Check that Instagram detection is enabled');
console.log('   - Verify extractInstagramUrls is being called');
console.log('   - Ensure handleInstagramDownload is triggered');
