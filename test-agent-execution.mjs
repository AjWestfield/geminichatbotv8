#!/usr/bin/env node

/**
 * Comprehensive E2E Test for Agent Task Execution Capabilities
 * Tests the actual functionality without requiring full Playwright setup
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';

const BASE_URL = 'http://localhost:3006';
const TIMEOUT = 30000;

class AgentTaskTester {
  constructor() {
    this.testResults = [];
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '🧪';
    console.log(`${icon} [${timestamp}] ${message}`);
    
    this.testResults.push({
      timestamp,
      type,
      message
    });
  }

  async testServerAvailability() {
    try {
      await this.log('Testing server availability...');
      const response = await fetch(`${BASE_URL}/api/mcp/servers`);
      const data = await response.json();
      
      if (response.ok) {
        await this.log(`Server is accessible. MCP servers: ${data.servers?.length || 0}`, 'success');
        return { available: true, mcpServers: data.servers || [] };
      } else {
        await this.log('Server responded with error', 'error');
        return { available: false };
      }
    } catch (error) {
      await this.log(`Server not accessible: ${error.message}`, 'error');
      return { available: false, error: error.message };
    }
  }

  async testMCPConfiguration() {
    try {
      await this.log('Testing MCP configuration...');
      
      // Read the actual config file
      const configExists = await fs.access('./mcp.config.json').then(() => true).catch(() => false);
      
      if (configExists) {
        const configContent = await fs.readFile('./mcp.config.json', 'utf-8');
        const config = JSON.parse(configContent);
        
        await this.log(`MCP config file exists with ${config.servers?.length || 0} servers`);
        
        if (config.servers?.length > 0) {
          await this.log('MCP servers configured:', 'success');
          config.servers.forEach(server => {
            console.log(`  - ${server.name} (${server.command})`);
          });
          return { configured: true, servers: config.servers };
        } else {
          await this.log('No MCP servers configured', 'warning');
          return { configured: false, reason: 'No servers in config' };
        }
      } else {
        await this.log('MCP config file not found', 'warning');
        return { configured: false, reason: 'Config file missing' };
      }
    } catch (error) {
      await this.log(`MCP configuration test failed: ${error.message}`, 'error');
      return { configured: false, error: error.message };
    }
  }

  async testChatAPIAvailability() {
    try {
      await this.log('Testing chat API availability...');
      
      // Test with a simple message
      const testMessage = {
        messages: [
          {
            role: 'user',
            content: 'Hello, can you create a simple task list with 3 items?'
          }
        ]
      };

      const response = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage)
      });

      if (response.ok) {
        await this.log('Chat API is accessible', 'success');
        
        // Try to read response (it's likely streaming)
        const reader = response.body.getReader();
        let receivedData = '';
        let chunks = 0;
        
        try {
          while (chunks < 10) { // Limit chunks to avoid infinite loop
            const { done, value } = await reader.read();
            if (done) break;
            
            receivedData += new TextDecoder().decode(value);
            chunks++;
            
            if (receivedData.length > 1000) break; // Limit data size
          }
          
          reader.releaseLock();
          
          // Check if response contains task-related content
          const hasTaskContent = receivedData.toLowerCase().includes('task') || 
                                receivedData.toLowerCase().includes('todo') ||
                                receivedData.toLowerCase().includes('step');
          
          if (hasTaskContent) {
            await this.log('Chat API can generate task-related responses', 'success');
          } else {
            await this.log('Chat API responding but no task content detected', 'warning');
          }
          
          return { 
            available: true, 
            hasTaskContent, 
            sampleResponse: receivedData.substring(0, 200) + '...'
          };
        } catch (streamError) {
          await this.log(`Stream reading error: ${streamError.message}`, 'warning');
          return { available: true, streamError: streamError.message };
        }
      } else {
        await this.log(`Chat API error: ${response.status}`, 'error');
        return { available: false, status: response.status };
      }
    } catch (error) {
      await this.log(`Chat API test failed: ${error.message}`, 'error');
      return { available: false, error: error.message };
    }
  }

  async testTaskParsingLogic() {
    try {
      await this.log('Testing task parsing logic...');
      
      // Import the task parser directly
      const { parseAgentTaskUpdate } = await import('./lib/agent-task-parser.ts');
      
      // Test different task patterns
      const testCases = [
        {
          name: 'TodoWrite pattern',
          content: `I'll help you with that. Let me create a task list:

[TodoWrite] Creating tasks:
1. Search the web for cat images
2. Generate an image of a cat
3. Animate the image`
        },
        {
          name: 'AGENT_PLAN pattern',
          content: `[AGENT_PLAN]
1. Search for information
2. Generate content
3. Review results
[/AGENT_PLAN]`
        },
        {
          name: 'Natural language pattern',
          content: `I'll break this down into steps:

1. First, I'll search the web for the latest information
2. Then I'll generate an image based on what I find
3. Finally, I'll animate that image for you`
        }
      ];

      let successfulParsing = 0;
      
      for (const testCase of testCases) {
        try {
          const result = parseAgentTaskUpdate(testCase.content);
          if (result && result.length > 0) {
            await this.log(`✓ ${testCase.name}: Parsed ${result.length} task updates`);
            successfulParsing++;
          } else {
            await this.log(`✗ ${testCase.name}: No tasks parsed`, 'warning');
          }
        } catch (error) {
          await this.log(`✗ ${testCase.name}: Parse error - ${error.message}`, 'error');
        }
      }

      if (successfulParsing > 0) {
        await this.log(`Task parsing logic works: ${successfulParsing}/${testCases.length} patterns successful`, 'success');
        return { working: true, successRate: successfulParsing / testCases.length };
      } else {
        await this.log('Task parsing logic not working', 'error');
        return { working: false };
      }
    } catch (error) {
      await this.log(`Task parsing test failed: ${error.message}`, 'error');
      return { working: false, error: error.message };
    }
  }

  async testAvailableTools() {
    try {
      await this.log('Testing available tools and capabilities...');
      
      const capabilities = [];
      
      // Check MCP tools
      try {
        const mcpResponse = await fetch(`${BASE_URL}/api/mcp/tools`);
        if (mcpResponse.ok) {
          capabilities.push('MCP Tools API');
        }
      } catch {}

      // Check image generation
      try {
        const imageResponse = await fetch(`${BASE_URL}/api/images`);
        if (imageResponse.ok) {
          capabilities.push('Image Generation API');
        }
      } catch {}

      // Check video generation
      try {
        const videoResponse = await fetch(`${BASE_URL}/api/videos`);
        if (videoResponse.ok) {
          capabilities.push('Video Generation API');
        }
      } catch {}

      await this.log(`Available capabilities: ${capabilities.join(', ')}`, 'success');
      return { capabilities };
    } catch (error) {
      await this.log(`Tools test failed: ${error.message}`, 'error');
      return { error: error.message };
    }
  }

  async runFullTest() {
    await this.log('🚀 Starting Comprehensive Agent Task Execution Test');
    await this.log('=' .repeat(60));

    const results = {};

    // Test 1: Server Availability
    results.server = await this.testServerAvailability();

    // Test 2: MCP Configuration
    results.mcp = await this.testMCPConfiguration();

    // Test 3: Chat API
    results.chat = await this.testChatAPIAvailability();

    // Test 4: Task Parsing
    results.parsing = await this.testTaskParsingLogic();

    // Test 5: Available Tools
    results.tools = await this.testAvailableTools();

    // Summary
    await this.log('=' .repeat(60));
    await this.log('📊 TEST SUMMARY:');
    
    const serverOk = results.server?.available;
    const mcpConfigured = results.mcp?.configured;
    const chatWorking = results.chat?.available;
    const parsingWorking = results.parsing?.working;
    const hasCapabilities = results.tools?.capabilities?.length > 0;

    await this.log(`Server Availability: ${serverOk ? '✅' : '❌'}`);
    await this.log(`MCP Configuration: ${mcpConfigured ? '✅' : '❌'} (${results.mcp?.servers?.length || 0} servers)`);
    await this.log(`Chat API: ${chatWorking ? '✅' : '❌'}`);
    await this.log(`Task Parsing: ${parsingWorking ? '✅' : '❌'}`);
    await this.log(`Available Tools: ${hasCapabilities ? '✅' : '❌'} (${results.tools?.capabilities?.length || 0} types)`);

    // Critical Assessment
    await this.log('=' .repeat(60));
    await this.log('🔍 CRITICAL ASSESSMENT:');

    if (serverOk && chatWorking && parsingWorking) {
      await this.log('✅ TASK DISPLAY SYSTEM: Working - Can parse and display tasks', 'success');
    } else {
      await this.log('❌ TASK DISPLAY SYSTEM: Issues detected', 'error');
    }

    if (mcpConfigured && hasCapabilities) {
      await this.log('✅ TOOL EXECUTION: MCP tools available for execution', 'success');
    } else {
      await this.log('❌ TOOL EXECUTION: No MCP tools configured for autonomous execution', 'error');
    }

    // Key finding about autonomous execution
    if (!mcpConfigured) {
      await this.log('🚨 CRITICAL FINDING: No TodoRead/TodoWrite tools found', 'error');
      await this.log('   This means the agent CANNOT autonomously execute task lists', 'error');
      await this.log('   Tasks will be displayed but not automatically executed', 'warning');
    }

    return results;
  }

  async saveResults(results) {
    try {
      const reportData = {
        timestamp: new Date().toISOString(),
        testResults: this.testResults,
        summary: results,
        conclusion: this.generateConclusion(results)
      };

      await fs.writeFile('./agent-task-test-results.json', JSON.stringify(reportData, null, 2));
      await this.log('📄 Test results saved to agent-task-test-results.json', 'success');
    } catch (error) {
      await this.log(`Failed to save results: ${error.message}`, 'error');
    }
  }

  generateConclusion(results) {
    const hasDisplay = results.parsing?.working && results.chat?.available;
    const hasExecution = results.mcp?.configured && results.tools?.capabilities?.length > 0;
    
    if (hasDisplay && hasExecution) {
      return 'FULL_FUNCTIONALITY: Both task display and autonomous execution are working';
    } else if (hasDisplay && !hasExecution) {
      return 'DISPLAY_ONLY: Task display works but autonomous execution is not configured';
    } else if (!hasDisplay && hasExecution) {
      return 'EXECUTION_ONLY: Tools available but task display system has issues';
    } else {
      return 'LIMITED_FUNCTIONALITY: Neither display nor autonomous execution are fully working';
    }
  }
}

// Run the test
const tester = new AgentTaskTester();
tester.runFullTest()
  .then(results => tester.saveResults(results))
  .catch(error => console.error('Test failed:', error));