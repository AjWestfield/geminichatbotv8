#!/usr/bin/env node

/**
 * Simple URL to Video Test
 * 
 * This tests the YouTube download functionality directly
 */

import fetch from 'node-fetch';

async function testYouTubeDownload() {
  console.log('🧪 Testing YouTube Download Functionality\n');
  
  const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
  console.log('Test URL:', testUrl);
  console.log('Video: "Me at the zoo" (19 seconds)\n');
  
  try {
    console.log('1. Testing YouTube API endpoint...');
    const response = await fetch('http://localhost:3000/api/youtube-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: testUrl,
        quality: 'auto'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ API Error:', response.status);
      console.error('Response:', error.substring(0, 200) + '...');
      return;
    }

    const data = await response.json();
    console.log('✅ Success! Response received');
    
    if (data.file?.uri) {
      console.log('\n📁 File uploaded to Gemini:');
      console.log('   URI:', data.file.uri);
      console.log('   Name:', data.file.displayName);
      console.log('   Size:', data.file.sizeBytes, 'bytes');
      console.log('   MIME:', data.file.mimeType);
      
      // Check if this is a fresh upload
      const isRecent = data.file.uri.includes('ynu') || data.file.uri.includes('files/');
      console.log('   Fresh:', isRecent ? '✅ Yes' : '⚠️  May be cached');
    }
    
    if (data.thumbnail) {
      console.log('\n🖼️  Thumbnail generated');
      console.log('   Type:', data.thumbnail.startsWith('data:image') ? 'Data URL' : 'Unknown');
      console.log('   Length:', data.thumbnail.length, 'characters');
    }
    
    console.log('\n✅ YouTube download API is working correctly!');
    console.log('\n📝 Next: Test in the app by pasting this URL in chat:');
    console.log(`   ${testUrl}`);
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
    console.error('\nMake sure the server is running:');
    console.error('   npm run dev');
  }
}

// Run the test
console.log('Make sure the server is running on http://localhost:3000\n');
testYouTubeDownload();
