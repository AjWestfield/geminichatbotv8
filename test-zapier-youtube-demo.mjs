#!/usr/bin/env node

/**
 * Demo of Zapier MCP YouTube functionality
 * Shows actual tool execution and results
 */

import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: '.env.local' });

async function demoYouTubeSearch() {
  console.log('🎬 Zapier MCP YouTube Search Demo\n');
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  
  try {
    console.log('Searching for videos from "Aj and Selena" channel...\n');
    
    const response = await anthropic.beta.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Use the zapier_youtube_find_video tool to find videos from the "Aj and Selena" channel. 
          Set max_results to "3" and order by date (newest first).
          After executing the tool, summarize what you found.`,
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
    
    // Extract and display the response
    console.log('📋 Full Response:');
    console.log('================\n');
    
    response.content.forEach((item, index) => {
      if (item.type === 'text') {
        console.log(`[Text ${index + 1}]:`);
        console.log(item.text);
        console.log('');
      } else if (item.type === 'mcp_tool_use') {
        console.log(`[Tool Use ${index + 1}]: ${item.name}`);
        console.log('Input:', JSON.stringify(item.input, null, 2));
        console.log('');
      } else if (item.type === 'mcp_tool_result') {
        console.log(`[Tool Result ${index + 1}]:`);
        const result = item.content[0]?.text;
        if (result) {
          try {
            const parsed = JSON.parse(result);
            console.log('Success:', parsed.execution?.status === 'SUCCESS');
            console.log('Results:', parsed.results);
            if (parsed.feedbackUrl) {
              console.log('Feedback URL:', parsed.feedbackUrl);
            }
          } catch (e) {
            console.log(result);
          }
        }
        console.log('');
      }
    });
    
    console.log('\n✅ Demo completed successfully!');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.response?.data) {
      console.log('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the demo
demoYouTubeSearch();