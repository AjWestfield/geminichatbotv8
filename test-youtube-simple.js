/**
 * Simple URL to Video Test
 * 
 * This tests the YouTube download functionality directly
 */

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
      console.error('Response:', error);
      return;
    }

    const data = await response.json();
    console.log('✅ Success! Response:', JSON.stringify(data, null, 2));
    
    if (data.file?.uri) {
      console.log('\n📁 File uploaded to Gemini:');
      console.log('   URI:', data.file.uri);
      console.log('   Name:', data.file.displayName);
      console.log('   Size:', data.file.sizeBytes, 'bytes');
      console.log('   MIME:', data.file.mimeType);
    }
    
    if (data.thumbnail) {
      console.log('\n🖼️  Thumbnail generated');
      console.log('   Length:', data.thumbnail.length, 'characters');
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
}

// Run the test
console.log('Make sure the server is running on http://localhost:3000\n');
testYouTubeDownload();
