#!/usr/bin/env node

/**
 * Test YouTube query functionality with Zapier MCP
 */

import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: '.env.local' });

async function testYouTubeQuery() {
  console.log('📺 Testing YouTube Query via Zapier MCP\n');
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  
  try {
    console.log('Querying for latest Aj and Selena YouTube video...\n');
    
    const response = await anthropic.beta.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: 'Use the zapier_youtube_find_video tool to find the latest video from the "Aj and Selena" YouTube channel. Show me the title and upload date.',
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
    
    console.log('✅ Success! Full response:');
    console.log(JSON.stringify(response, null, 2));
    
    // Extract text content
    const textContent = response.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n');
    
    if (textContent) {
      console.log('\n📝 Text response:');
      console.log(textContent);
    }
    
    // Show tool usage
    const toolUse = response.content.filter(c => c.type === 'tool_use');
    if (toolUse.length > 0) {
      console.log('\n🛠️  Tools used:');
      toolUse.forEach(tool => {
        console.log(`- ${tool.name}`);
        console.log(`  Input: ${JSON.stringify(tool.input)}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    
    if (error.response?.data) {
      console.log('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testYouTubeQuery();