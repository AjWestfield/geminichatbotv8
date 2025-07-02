#!/usr/bin/env node

/**
 * Simple test to check Zapier MCP connection
 * This uses direct API calls to test the integration
 */

import fetch from 'node-fetch';

async function testZapierConnection() {
  console.log('🔍 Testing Zapier MCP Connection\n');
  
  const url = process.env.ZAPIER_MCP_SERVER_URL || 'https://mcp.zapier.com/api/mcp/mcp';
  const apiKey = process.env.ZAPIER_MCP_API_KEY || '';
  
  if (!apiKey) {
    console.error('❌ ZAPIER_MCP_API_KEY not found in environment');
    return;
  }
  
  console.log('📡 Server URL:', url);
  console.log('🔑 API Key:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 10));
  
  try {
    // Test basic connection with initialize request
    console.log('\n📤 Sending initialize request...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${apiKey}` // Zapier MCP requires Bearer prefix
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '1.0',
          capabilities: {}
        }
      })
    });
    
    const responseText = await response.text();
    console.log('\n📥 Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    console.log('Response body:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed JSON:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('Failed to parse as JSON');
      return;
    }
    
    if (data.result) {
      console.log('\n✅ Successfully connected to Zapier MCP!');
      
      // Try to list tools
      console.log('\n📤 Listing available tools...');
      
      const toolsResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {}
        })
      });
      
      const toolsData = await toolsResponse.json();
      
      if (toolsData.result?.tools) {
        console.log(`\n✅ Found ${toolsData.result.tools.length} tools:`);
        
        // Filter for social media tools
        const socialTools = toolsData.result.tools.filter(tool => 
          tool.name.includes('youtube') || 
          tool.name.includes('instagram') || 
          tool.name.includes('facebook')
        );
        
        console.log('\n📱 Social Media Tools:');
        socialTools.forEach(tool => {
          console.log(`\n  • ${tool.name}`);
          if (tool.description) {
            console.log(`    Description: ${tool.description}`);
          }
          if (tool.inputSchema?.required) {
            console.log(`    Required params: ${tool.inputSchema.required.join(', ')}`);
          }
        });
        
        // Show YouTube tool details
        const youtubeTool = toolsData.result.tools.find(t => t.name === 'youtube_find_video');
        if (youtubeTool) {
          console.log('\n📺 YouTube Tool Details:');
          console.log(JSON.stringify(youtubeTool, null, 2));
        }
      }
    } else if (data.error) {
      console.error('\n❌ Error:', data.error);
    }
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('\nPossible causes:');
    console.error('1. Invalid API key');
    console.error('2. Server URL is incorrect');
    console.error('3. Network issues');
  }
}

// Run the test
console.log('================================');
console.log(' Zapier MCP Connection Test');
console.log('================================');

testZapierConnection().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});