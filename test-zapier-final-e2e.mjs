#!/usr/bin/env node

/**
 * Final E2E Test for Zapier MCP Integration
 * Verifies the complete integration is working properly
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: '.env.local' });

async function runFinalE2ETest() {
  console.log('🧪 Zapier MCP Final E2E Test\n');
  
  const results = {
    apiEndpoint: false,
    anthropicSDK: false,
    toolDiscovery: false,
    youtubeQuery: false
  };
  
  // Test 1: API Endpoint
  console.log('1️⃣ Testing API Endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/test-zapier-anthropic');
    const data = await response.json();
    results.apiEndpoint = data.success;
    console.log(results.apiEndpoint ? '✅ API endpoint working' : '❌ API endpoint failed');
  } catch (error) {
    console.log('❌ API endpoint error:', error.message);
  }
  
  // Test 2: Direct Anthropic SDK
  console.log('\n2️⃣ Testing Anthropic SDK Integration...');
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  
  try {
    const response = await anthropic.beta.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: 'Using Zapier MCP, list the first 3 available tools.',
        },
      ],
      mcp_servers: [
        {
          type: 'url',
          url: process.env.ZAPIER_MCP_SERVER_URL,
          name: 'zapier',
          authorization_token: process.env.ZAPIER_MCP_API_KEY,
        },
      ],
      // @ts-ignore
      betas: ['mcp-client-2025-04-04'],
    });
    
    const content = response.content[0]?.text || '';
    results.anthropicSDK = content.includes('tool') || content.includes('zapier');
    console.log(results.anthropicSDK ? '✅ Anthropic SDK working' : '❌ Anthropic SDK failed');
    
    if (content.includes('youtube') || content.includes('facebook') || content.includes('instagram')) {
      results.toolDiscovery = true;
      console.log('✅ Social media tools discovered');
    }
  } catch (error) {
    console.log('❌ Anthropic SDK error:', error.message);
  }
  
  // Test 3: YouTube Query
  console.log('\n3️⃣ Testing YouTube Query...');
  try {
    const response = await anthropic.beta.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: 'Use the zapier_youtube_find_video tool to search for "Aj and Selena" channel. Just execute the tool.',
        },
      ],
      mcp_servers: [
        {
          type: 'url',
          url: process.env.ZAPIER_MCP_SERVER_URL,
          name: 'zapier',
          authorization_token: process.env.ZAPIER_MCP_API_KEY,
        },
      ],
      // @ts-ignore
      betas: ['mcp-client-2025-04-04'],
    });
    
    const hasToolUse = response.content.some(c => c.type === 'mcp_tool_use' || c.type === 'tool_use');
    results.youtubeQuery = hasToolUse;
    console.log(results.youtubeQuery ? '✅ YouTube query executed' : '❌ YouTube query failed');
  } catch (error) {
    console.log('❌ YouTube query error:', error.message);
  }
  
  // Summary
  console.log('\n📊 E2E Test Summary');
  console.log('===================');
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  console.log(`Passed: ${passed}/${total}`);
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Zapier MCP is fully operational!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above.');
  }
  
  return passed === total;
}

// Run the test
runFinalE2ETest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });