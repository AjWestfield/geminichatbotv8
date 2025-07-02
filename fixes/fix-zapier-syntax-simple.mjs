#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

async function fixZapierInstructionsSyntax() {
  console.log('🔧 Fixing syntax error in mcp-agent-zapier-instructions.ts...\n');

  const filePath = path.join(projectRoot, 'lib/mcp/mcp-agent-zapier-instructions.ts');
  
  // Read the file
  let content = await fs.readFile(filePath, 'utf8');
  
  // Find all occurrences of triple backticks and replace them with escaped versions
  // But we need to be careful not to escape the template literal delimiters
  
  // First, let's extract the content between the template literal delimiters
  const match = content.match(/export const MCP_AGENT_ZAPIER_INSTRUCTIONS = `([\s\S]*)`/);
  
  if (match) {
    let innerContent = match[1];
    
    // Replace all backticks in the inner content with escaped versions
    innerContent = innerContent.replace(/`/g, '\\`');
    
    // Reconstruct the file
    content = `export const MCP_AGENT_ZAPIER_INSTRUCTIONS = \`${innerContent}\`;`;
    
    // Write the fixed content
    await fs.writeFile(filePath, content);
    
    console.log('✅ Fixed syntax error in mcp-agent-zapier-instructions.ts');
    console.log('   - Escaped all backticks inside the template literal');
    console.log('   - File should now compile without syntax errors\n');
    
    console.log('Please restart your development server to apply the fix.');
  } else {
    console.error('❌ Could not find the template literal in the file');
  }
}

// Run the fix
fixZapierInstructionsSyntax().catch(console.error);
