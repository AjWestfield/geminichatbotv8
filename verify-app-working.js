#!/usr/bin/env node

import fetch from 'node-fetch';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

const baseUrl = 'http://localhost:3000';
let devServer = null;

async function checkServerRunning() {
  try {
    const response = await fetch(baseUrl);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function startDevServer() {
  console.log('🚀 Starting development server...');
  
  devServer = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    shell: true
  });

  let serverReady = false;
  
  devServer.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);
    if (output.includes('Ready on http://localhost:3000')) {
      serverReady = true;
    }
  });

  devServer.stderr.on('data', (data) => {
    console.error(`Dev server error: ${data}`);
  });

  // Wait for server to be ready
  let attempts = 0;
  while (!serverReady && attempts < 30) {
    await setTimeout(1000);
    attempts++;
  }

  if (!serverReady) {
    throw new Error('Dev server failed to start');
  }

  // Give it a bit more time to fully initialize
  await setTimeout(3000);
}

async function testAppLoading() {
  console.log('\n🧪 Testing app loading...\n');

  // Check if server is already running
  const isRunning = await checkServerRunning();
  
  if (!isRunning) {
    await startDevServer();
  } else {
    console.log('✅ Dev server already running\n');
  }

  // Test 1: Check if the app loads
  console.log('1. Testing if app loads...');
  try {
    const response = await fetch(baseUrl);
    if (response.ok) {
      console.log('   ✅ App loaded successfully');
      const html = await response.text();
      
      // Check for common error patterns
      if (html.includes('Error:') || html.includes('webpack') && html.includes('error')) {
        console.log('   ⚠️  Possible error in HTML response');
      }
    } else {
      console.log('   ❌ App returned error:', response.status);
    }
  } catch (error) {
    console.log('   ❌ Failed to load app:', error.message);
  }

  // Test 2: Check API endpoints
  console.log('\n2. Testing API endpoints...');
  const endpoints = ['/api/chats', '/api/images', '/api/videos'];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`);
      console.log(`   ${endpoint}: ${response.ok ? '✅' : '❌'} (${response.status})`);
    } catch (error) {
      console.log(`   ${endpoint}: ❌ Failed`);
    }
  }

  console.log('\n✅ Basic app tests complete');
  console.log('\n📌 Next steps:');
  console.log('   1. Open http://localhost:3000 in your browser');
  console.log('   2. Check if you can interact with the chat');
  console.log('   3. Run E2E tests: npm run test:e2e');
}

// Handle cleanup
process.on('SIGINT', () => {
  if (devServer) {
    console.log('\nShutting down dev server...');
    devServer.kill();
  }
  process.exit(0);
});

testAppLoading().catch(console.error).finally(() => {
  if (devServer) {
    // Keep server running for manual testing
    console.log('\n🌐 Dev server is running. Press Ctrl+C to stop.');
  }
});