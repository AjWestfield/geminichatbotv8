#!/usr/bin/env node

/**
 * E2E Test for Zapier MCP Integration with Anthropic API
 * Tests the complete flow from API call to social media query
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import Anthropic from '@anthropic-ai/sdk';

// Load environment variables
dotenv.config({ path: '.env.local' });

const ZAPIER_URL = process.env.ZAPIER_MCP_SERVER_URL || 'https://mcp.zapier.com/api/mcp/mcp';
const ZAPIER_API_KEY = process.env.ZAPIER_MCP_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// Test results tracker
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}`);
  if (details) console.log(`   ${details}`);
  
  testResults.tests.push({ name, passed, details });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

async function testEnvironmentSetup() {
  console.log('\n🔍 Testing Environment Setup...\n');
  
  logTest('ZAPIER_MCP_SERVER_URL configured', !!ZAPIER_URL, ZAPIER_URL);
  logTest('ZAPIER_MCP_API_KEY configured', !!ZAPIER_API_KEY, ZAPIER_API_KEY ? 'Key present' : 'Key missing');
  logTest('ANTHROPIC_API_KEY configured', !!ANTHROPIC_API_KEY, ANTHROPIC_API_KEY ? 'Key present' : 'Key missing');
  
  return !!ZAPIER_URL && !!ZAPIER_API_KEY && !!ANTHROPIC_API_KEY;
}

async function testDirectMCPConnection() {
  console.log('\n🔌 Testing Direct MCP Connection...\n');
  
  try {
    const response = await fetch(ZAPIER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${ZAPIER_API_KEY}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '1.0',
          capabilities: {}
        },
        id: 1
      })
    });
    
    const responseText = await response.text();
    
    if (response.status === 200) {
      try {
        const data = JSON.parse(responseText);
        logTest('MCP Initialize Request', !!data.result, `Protocol: ${data.result?.protocolVersion || 'unknown'}`);
        return true;
      } catch (e) {
        logTest('MCP Initialize Request', false, 'Invalid JSON response');
        return false;
      }
    } else {
      logTest('MCP Initialize Request', false, `HTTP ${response.status}: ${responseText.substring(0, 100)}`);
      return false;
    }
  } catch (error) {
    logTest('MCP Initialize Request', false, error.message);
    return false;
  }
}

async function testAnthropicSDK() {
  console.log('\n🤖 Testing Anthropic SDK...\n');
  
  try {
    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });
    
    // Test basic Anthropic API
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Using Haiku for faster/cheaper test
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: 'Say "API working" if you can read this.',
        },
      ],
    });
    
    const working = response.content[0]?.text?.includes('API working');
    logTest('Anthropic API Basic Test', working, working ? 'API is responsive' : 'Unexpected response');
    return working;
  } catch (error) {
    logTest('Anthropic API Basic Test', false, error.message);
    return false;
  }
}

async function testZapierMCPWithAnthropic() {
  console.log('\n🔗 Testing Zapier MCP with Anthropic...\n');
  
  try {
    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });
    
    console.log('Attempting to list Zapier tools via Anthropic MCP...');
    
    const response = await anthropic.beta.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: 'List all available Zapier MCP tools. Just list the tool names, nothing else.',
        },
      ],
      mcp_servers: [
        {
          type: 'url',
          url: ZAPIER_URL,
          name: 'zapier',
          authorization_token: ZAPIER_API_KEY,
        },
      ],
      // @ts-ignore - Beta feature
      betas: ['mcp-client-2025-04-04'],
    });
    
    const content = response.content[0]?.text || '';
    const hasTools = content.toLowerCase().includes('youtube') || 
                     content.toLowerCase().includes('facebook') || 
                     content.toLowerCase().includes('instagram') ||
                     content.toLowerCase().includes('tool');
    
    logTest('Zapier MCP Tools List', hasTools, hasTools ? 'Tools found in response' : 'No tools found');
    console.log('\nResponse preview:', content.substring(0, 200) + '...');
    
    return hasTools;
  } catch (error) {
    const errorMsg = error.message || 'Unknown error';
    const isOverloaded = errorMsg.includes('overloaded') || errorMsg.includes('529');
    
    logTest('Zapier MCP Tools List', false, isOverloaded ? 'Anthropic API overloaded (temporary)' : errorMsg);
    return false;
  }
}

async function testYouTubeQuery() {
  console.log('\n📺 Testing YouTube Query...\n');
  
  try {
    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });
    
    console.log('Querying for latest YouTube video...');
    
    const response = await anthropic.beta.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: 'Using the youtube_find_video tool, find the latest video from the Aj and Selena YouTube channel. Return just the video title and upload date.',
        },
      ],
      mcp_servers: [
        {
          type: 'url',
          url: ZAPIER_URL,
          name: 'zapier',
          authorization_token: ZAPIER_API_KEY,
        },
      ],
      // @ts-ignore - Beta feature
      betas: ['mcp-client-2025-04-04'],
    });
    
    const content = response.content[0]?.text || '';
    const hasVideoInfo = content.includes('video') || content.includes('title') || content.includes('upload');
    
    logTest('YouTube Video Query', hasVideoInfo, hasVideoInfo ? 'Video information retrieved' : 'No video info found');
    console.log('\nResponse:', content);
    
    return hasVideoInfo;
  } catch (error) {
    const errorMsg = error.message || 'Unknown error';
    const isOverloaded = errorMsg.includes('overloaded') || errorMsg.includes('529');
    
    logTest('YouTube Video Query', false, isOverloaded ? 'Anthropic API overloaded (temporary)' : errorMsg);
    return false;
  }
}

async function testAPIEndpoints() {
  console.log('\n🌐 Testing API Endpoints...\n');
  
  // Test generic MCP endpoint
  try {
    const response = await fetch('http://localhost:3000/api/test-zapier');
    const data = await response.json();
    logTest('Generic MCP API Endpoint', data.success, data.error || 'Endpoint working');
  } catch (error) {
    logTest('Generic MCP API Endpoint', false, 'Server not running or endpoint error');
  }
  
  // Test Anthropic integration endpoint
  try {
    const response = await fetch('http://localhost:3000/api/test-zapier-anthropic');
    const data = await response.json();
    logTest('Anthropic Integration Endpoint', data.success, data.error || 'Endpoint working');
  } catch (error) {
    logTest('Anthropic Integration Endpoint', false, 'Server not running or endpoint error');
  }
}

async function runE2ETests() {
  console.log('=====================================');
  console.log(' Zapier MCP E2E Test Suite');
  console.log('=====================================');
  console.log(`Date: ${new Date().toISOString()}`);
  
  // Run all tests
  const envOk = await testEnvironmentSetup();
  
  if (!envOk) {
    console.log('\n❌ Environment setup incomplete. Please check your .env.local file.');
    return;
  }
  
  await testDirectMCPConnection();
  await testAnthropicSDK();
  await testZapierMCPWithAnthropic();
  await testYouTubeQuery();
  await testAPIEndpoints();
  
  // Summary
  console.log('\n=====================================');
  console.log(' Test Summary');
  console.log('=====================================');
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  
  if (testResults.failed > 0) {
    console.log('\nFailed Tests:');
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`  - ${t.name}: ${t.details}`));
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  
  const anthropicOverloaded = testResults.tests.some(t => t.details.includes('overloaded'));
  if (anthropicOverloaded) {
    console.log('- Anthropic API is currently overloaded. Try again later or during off-peak hours.');
    console.log('- Consider using Claude Haiku model for testing (faster and more available).');
  }
  
  const authFailed = testResults.tests.some(t => t.details.includes('401') || t.details.includes('auth'));
  if (authFailed) {
    console.log('- Authentication issues detected. Verify your API keys at:');
    console.log('  - Anthropic: https://console.anthropic.com/settings/keys');
    console.log('  - Zapier MCP: https://mcp.zapier.com');
  }
  
  console.log('\n✅ E2E Test Complete');
}

// Run the tests
runE2ETests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});