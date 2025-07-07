#!/usr/bin/env node

console.log('🎥 Testing Video MIME Type Issues');
console.log('================================\n');

async function testVideoMimeType() {
  const baseUrl = 'http://localhost:3000';
  
  // Test Gemini URI
  const testUri = 'https://generativelanguage.googleapis.com/v1beta/files/nyp9665694fc';
  const proxyUrl = `${baseUrl}/api/video-proxy?uri=${encodeURIComponent(testUri)}`;
  
  console.log('📡 Testing video proxy response...\n');
  console.log('Proxy URL:', proxyUrl);
  
  try {
    const response = await fetch(proxyUrl);
    
    console.log('\n📊 Response Details:');
    console.log('- Status:', response.status, response.statusText);
    console.log('- Content-Type:', response.headers.get('Content-Type'));
    console.log('- Content-Length:', response.headers.get('Content-Length'));
    console.log('- Cache-Control:', response.headers.get('Cache-Control'));
    
    if (response.ok) {
      const blob = await response.blob();
      console.log('- Blob Size:', blob.size, 'bytes');
      console.log('- Blob Type:', blob.type);
      
      // Check if it's actually video content
      if (blob.type.startsWith('video/') || blob.type === 'application/octet-stream') {
        console.log('\n✅ Video content detected!');
      } else {
        console.log('\n⚠️  Unexpected content type:', blob.type);
        
        // Try to read first few bytes to check format
        const arrayBuffer = await blob.slice(0, 12).arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(' ');
        
        console.log('First 12 bytes (hex):', hex);
        
        // Check for common video file signatures
        if (hex.startsWith('00 00 00')) {
          console.log('Detected: Likely MP4/MOV format');
        }
      }
    } else {
      const errorText = await response.text();
      console.log('\n❌ Error Response:', errorText);
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
  }
  
  console.log('\n💡 Debugging Tips:');
  console.log('1. Check server logs for [Video Proxy] messages');
  console.log('2. Verify GEMINI_API_KEY is set correctly');
  console.log('3. Try uploading a fresh video file');
  console.log('4. Check browser DevTools Network tab for response details');
}

testVideoMimeType().catch(console.error);