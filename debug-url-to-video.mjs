#!/usr/bin/env node

import fetch from 'node-fetch';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 URL to Video Debugging Script\n');
console.log('=====================================\n');

// Test URLs
const testUrls = {
  youtube: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  youtubeShort: 'https://youtu.be/jNQXAC9IVRw',
  instagram: 'https://www.instagram.com/p/C5qLPhxsQMJ/',
  tiktok: 'https://www.tiktok.com/@username/video/7123456789012345678',
  facebook: 'https://www.facebook.com/watch?v=123456789'
};

// Check environment
async function checkEnvironment() {
  console.log('1️⃣ Checking Environment...\n');
  
  // Check if server is running
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (response.ok) {
      console.log('✅ Server is running on port 3000');
    }
  } catch (error) {
    console.log('❌ Server not running on port 3000');
    console.log('   Run: npm run dev');
  }

  // Check if .env.local exists
  try {
    await fs.access(path.join(__dirname, '.env.local'));
    console.log('✅ .env.local file exists');
    
    // Check for GEMINI_API_KEY
    const envContent = await fs.readFile(path.join(__dirname, '.env.local'), 'utf-8');
    if (envContent.includes('GEMINI_API_KEY=')) {
      console.log('✅ GEMINI_API_KEY is configured');
    } else {
      console.log('❌ GEMINI_API_KEY is missing');
    }
  } catch (error) {
    console.log('❌ .env.local file not found');
  }

  // Check yt-dlp installation
  try {
    const version = execSync('yt-dlp --version', { encoding: 'utf8' }).trim();
    console.log(`✅ yt-dlp installed (version: ${version})`);
  } catch (error) {
    console.log('❌ yt-dlp not installed');
    console.log('   Run: brew install yt-dlp');
  }

  console.log('');
}

// Test URL detection
async function testUrlDetection() {
  console.log('2️⃣ Testing URL Detection...\n');
  
  // Import the URL detection functions
  try {
    const { detectYouTubeUrl } = await import('./lib/youtube-url-utils.ts');
    
    // Test YouTube URL detection
    const youtubeResult = detectYouTubeUrl(testUrls.youtube);
    console.log('YouTube detection:', youtubeResult ? '✅ Working' : '❌ Failed');
    if (youtubeResult) {
      console.log(`  Video ID: ${youtubeResult.videoId}`);
      console.log(`  Normalized: ${youtubeResult.normalizedUrl}`);
    }
  } catch (error) {
    console.log('❌ Failed to import URL detection functions');
    console.log(`   Error: ${error.message}`);
  }

  console.log('');
}

// Test API endpoints
async function testApiEndpoints() {
  console.log('3️⃣ Testing API Endpoints...\n');

  // Test YouTube download endpoint
  console.log('Testing YouTube download API...');
  try {
    const response = await fetch('http://localhost:3000/api/youtube-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url: testUrls.youtube,
        quality: 'auto'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ YouTube API responded successfully');
      console.log(`   File URI: ${data.file?.uri || 'N/A'}`);
    } else {
      const error = await response.text();
      console.log('❌ YouTube API error:', response.status);
      console.log(`   ${error.substring(0, 100)}...`);
    }
  } catch (error) {
    console.log('❌ Failed to reach YouTube API');
    console.log(`   ${error.message}`);
  }

  // Test SSE endpoint
  console.log('\nTesting YouTube SSE endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/youtube-download-sse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url: testUrls.youtube,
        quality: 'auto'
      })
    });

    console.log('✅ SSE endpoint responded:', response.status);
  } catch (error) {
    console.log('❌ Failed to reach SSE endpoint');
    console.log(`   ${error.message}`);
  }

  console.log('');
}

// Test direct yt-dlp
async function testYtDlp() {
  console.log('4️⃣ Testing yt-dlp Directly...\n');

  try {
    console.log('Extracting video info...');
    const info = execSync(`yt-dlp -j "${testUrls.youtube}" 2>/dev/null`, { 
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024 
    });
    
    const videoInfo = JSON.parse(info);
    console.log('✅ yt-dlp can access the video');
    console.log(`   Title: ${videoInfo.title}`);
    console.log(`   Duration: ${videoInfo.duration}s`);
    console.log(`   Formats: ${videoInfo.formats?.length || 0}`);
  } catch (error) {
    console.log('❌ yt-dlp failed to extract video info');
    console.log(`   ${error.message}`);
    
    // Try to get more detailed error
    try {
      execSync(`yt-dlp -v "${testUrls.youtube}"`, { stdio: 'inherit' });
    } catch (e) {
      // Error details will be printed to console
    }
  }

  console.log('');
}

// Check for common issues
async function checkCommonIssues() {
  console.log('5️⃣ Checking Common Issues...\n');

  // Check if port 3001 is in use
  try {
    execSync('lsof -i :3001', { encoding: 'utf8' });
    console.log('⚠️  Port 3001 is in use - app might be running on wrong port');
  } catch (error) {
    console.log('✅ Port 3001 is free');
  }

  // Check for duplicate dependencies
  try {
    const packageJson = JSON.parse(await fs.readFile(path.join(__dirname, 'package.json'), 'utf-8'));
    console.log('✅ Package.json is valid');
    
    // Check for yt-dlp-wrap
    if (packageJson.dependencies['yt-dlp-wrap']) {
      console.log('✅ yt-dlp-wrap is in dependencies');
    } else {
      console.log('❌ yt-dlp-wrap is missing from dependencies');
    }
  } catch (error) {
    console.log('❌ Failed to read package.json');
  }

  console.log('');
}

// Generate test report
async function generateReport() {
  console.log('📋 Test Summary\n');
  console.log('=====================================\n');
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      cwd: process.cwd()
    },
    recommendations: []
  };

  // Add recommendations based on findings
  report.recommendations.push('1. Ensure server is running: npm run dev');
  report.recommendations.push('2. Update yt-dlp: brew upgrade yt-dlp');
  report.recommendations.push('3. Clear yt-dlp cache: yt-dlp --rm-cache-dir');
  report.recommendations.push('4. Test with a simple video first');
  report.recommendations.push('5. Check browser console for errors');

  console.log('Recommendations:');
  report.recommendations.forEach(rec => console.log(`  ${rec}`));

  // Save report
  await fs.writeFile(
    path.join(__dirname, 'url-to-video-debug-report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n✅ Debug report saved to: url-to-video-debug-report.json');
}

// Run all tests
async function runAllTests() {
  try {
    await checkEnvironment();
    await testUrlDetection();
    await testApiEndpoints();
    await testYtDlp();
    await checkCommonIssues();
    await generateReport();
  } catch (error) {
    console.error('\n❌ Debug script error:', error);
  }
}

// Run the tests
runAllTests();
