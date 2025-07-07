#!/usr/bin/env node

// Simple script to verify video proxy endpoint is working

console.log('🔍 Video Proxy Verification');
console.log('=========================\n');

async function testVideoProxy() {
  const baseUrl = 'http://localhost:3000';
  
  // Test cases
  const tests = [
    {
      name: 'Test proxy with regular URL',
      url: `${baseUrl}/api/video-proxy?url=${encodeURIComponent('https://example.com/video.mp4')}`,
      expected: 'Should proxy regular video URLs'
    },
    {
      name: 'Test proxy with Gemini URI',
      url: `${baseUrl}/api/video-proxy?uri=${encodeURIComponent('https://generativelanguage.googleapis.com/v1/files/abc123')}`,
      expected: 'Should handle Gemini file URIs'
    },
    {
      name: 'Test with missing parameters',
      url: `${baseUrl}/api/video-proxy`,
      expected: 'Should return 400 error'
    }
  ];
  
  console.log('🚀 Starting tests...\n');
  
  for (const test of tests) {
    console.log(`📋 ${test.name}`);
    console.log(`   URL: ${test.url}`);
    
    try {
      const response = await fetch(test.url, {
        method: 'GET',
        headers: {
          'Accept': 'video/*,*/*'
        }
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Content-Type: ${response.headers.get('Content-Type')}`);
      
      if (response.status === 400) {
        const json = await response.json();
        console.log(`   Error: ${json.error}`);
      }
      
      if (response.ok) {
        console.log(`   ✅ ${test.expected}`);
      } else {
        console.log(`   ⚠️  Response indicates an issue`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }
  
  // Test video source detection logic
  console.log('🔧 Testing video source detection logic:\n');
  
  const fileExamples = [
    {
      name: 'File with Gemini URI',
      file: {
        url: null,
        geminiFileUri: 'https://generativelanguage.googleapis.com/v1/files/test123'
      }
    },
    {
      name: 'File with regular URL',
      file: {
        url: 'https://example.com/video.mp4',
        geminiFileUri: null
      }
    },
    {
      name: 'File with both URLs',
      file: {
        url: 'https://example.com/video.mp4',
        geminiFileUri: 'https://generativelanguage.googleapis.com/v1/files/test123'
      }
    }
  ];
  
  for (const example of fileExamples) {
    console.log(`📁 ${example.name}:`);
    
    // Simulate the logic from FilePreviewModal
    let videoSrc = '';
    if (example.file.geminiFileUri && example.file.geminiFileUri.startsWith('https://generativelanguage.googleapis.com/')) {
      videoSrc = `/api/video-proxy?uri=${encodeURIComponent(example.file.geminiFileUri)}`;
    } else if (example.file.url) {
      videoSrc = example.file.url;
    }
    
    console.log(`   Resolved video source: ${videoSrc || '(none)'}`);
    console.log('');
  }
  
  console.log('✅ Verification complete!\n');
  
  console.log('💡 Next steps:');
  console.log('1. Upload a video file in the chat');
  console.log('2. Click on the video thumbnail');
  console.log('3. Check browser console for debug logs');
  console.log('4. Verify video plays correctly in modal');
}

// Run the test
testVideoProxy().catch(console.error);