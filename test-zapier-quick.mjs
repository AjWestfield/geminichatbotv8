#!/usr/bin/env node

/**
 * Quick test for Zapier MCP with Anthropic
 */

import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: '.env.local' });

async function quickTest() {
  console.log('🚀 Quick Zapier MCP Test\n');
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  
  try {
    console.log('Testing Anthropic API with Zapier MCP...');
    
    const response = await anthropic.beta.messages.create({
      model: 'claude-3-haiku-20240307', // Using Haiku for speed
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: 'List available Zapier tools briefly.',
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
    
    console.log('\n✅ Success! Response:');
    console.log(response.content[0]?.text || 'No response');
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
    
    if (error.message.includes('overloaded')) {
      console.log('\n💡 Anthropic API is currently overloaded. This is temporary.');
      console.log('   Try again in a few minutes or during off-peak hours.');
    } else if (error.message.includes('401')) {
      console.log('\n💡 Authentication error. Check your API keys.');
    }
  }
}

quickTest();