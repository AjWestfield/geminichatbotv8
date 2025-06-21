#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execAsync = promisify(exec);

async function optimizeMessagesTable() {
  console.log('🔧 GeminiChatbotv6 - Messages Table Optimization\n');
  console.log('This will optimize the messages table to fix timeout issues.\n');
  
  // Read the SQL file
  const sqlPath = join(__dirname, 'optimize-messages-table.sql');
  const sqlContent = readFileSync(sqlPath, 'utf8');
  
  // Copy to clipboard if possible
  try {
    const platform = process.platform;
    let command;
    
    if (platform === 'darwin') {
      command = 'pbcopy';
    } else if (platform === 'win32') {
      command = 'clip';
    } else {
      command = 'xclip -selection clipboard';
    }
    
    await execAsync(`echo "${sqlContent.replace(/"/g, '\\"')}" | ${command}`);
    console.log('✅ SQL copied to clipboard!\n');
  } catch (error) {
    console.log('⚠️  Could not copy to clipboard automatically.\n');
  }
  
  console.log('📋 Follow these steps:\n');
  console.log('1. Open Supabase SQL Editor:');
  console.log('   https://bsocqrwrikfmymklgart.supabase.co/project/bsocqrwrikfmymklgart/sql/new\n');
  console.log('2. Paste the SQL (already in your clipboard) or copy from:');
  console.log(`   ${sqlPath}\n`);
  console.log('3. Click "Run" to execute the optimization\n');
  console.log('4. After completion, run: npm run db:check\n');
  
  // Try to open the URL
  try {
    const openCommand = process.platform === 'darwin' ? 'open' : 
                       process.platform === 'win32' ? 'start' : 'xdg-open';
    await execAsync(`${openCommand} "https://bsocqrwrikfmymklgart.supabase.co/project/bsocqrwrikfmymklgart/sql/new"`);
    console.log('💡 Opening Supabase SQL editor in your browser...\n');
  } catch (error) {
    console.log('💡 Please open the link above in your browser.\n');
  }
  
  console.log('🎯 What this optimization does:');
  console.log('• Analyzes table statistics for better query planning');
  console.log('• Creates optimized composite indexes');
  console.log('• Adds full-text search capability');
  console.log('• Vacuums and reindexes the table');
  console.log('• Updates table statistics');
  console.log('• Provides health check information\n');
}

optimizeMessagesTable().catch(console.error);