#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

console.log('🚨 EMERGENCY DATABASE FIX\n');
console.log('This script will help you fix the database timeout issues.\n');

// Read the SQL file
const sqlPath = join(__dirname, 'optimize-performance-emergency.sql');
const sqlContent = readFileSync(sqlPath, 'utf-8');

// Split SQL into individual statements
const statements = sqlContent
  .split('\n')
  .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
  .join('\n')
  .split(';')
  .filter(stmt => stmt.trim().length > 0)
  .map(stmt => stmt.trim() + ';');

console.log('📋 MANUAL STEPS REQUIRED:\n');
console.log('1. Open Supabase SQL Editor:');
console.log(`   ${supabaseUrl.replace('/rest/v1', '')}/project/${supabaseUrl.split('.')[0].split('//')[1]}/sql/new\n`);

console.log('2. Run these commands ONE AT A TIME:\n');

console.log('   -- Step 1: Analyze tables (run this first)');
console.log('   ANALYZE messages;');
console.log('   ANALYZE chats;\n');

console.log('   -- Step 2: Create the critical index (most important!)');
console.log('   CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at_desc');
console.log('   ON messages(chat_id, created_at DESC);\n');

console.log('   -- Step 3: Check if it worked');
console.log('   SELECT * FROM pg_indexes WHERE tablename = \'messages\';\n');

console.log('3. If you get transaction errors, make sure to:');
console.log('   - Run each statement separately');
console.log('   - Click "Run" after each statement');
console.log('   - Do NOT select multiple statements at once\n');

console.log('🔧 ALTERNATIVE: Quick Test Query\n');
console.log('Run this to test if messages load faster:');
console.log(`
SELECT id, role, content, created_at
FROM messages
WHERE chat_id = '872f2da8-21e9-48f8-bd8d-af70ca7ee180'
ORDER BY created_at DESC
LIMIT 200;
`);

console.log('\n💡 TIPS:');
console.log('- If queries still timeout, increase the statement timeout:');
console.log('  SET statement_timeout = \'30s\';');
console.log('- Monitor query performance in the Supabase dashboard');
console.log('- Consider upgrading your Supabase plan if on free tier\n');

// Try to open the URL
try {
  const projectRef = supabaseUrl.split('.')[0].split('//')[1];
  const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
  
  const openCommand = process.platform === 'darwin' ? 'open' : 
                     process.platform === 'win32' ? 'start' : 'xdg-open';
  
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  await execAsync(`${openCommand} "${sqlEditorUrl}"`);
  console.log('💡 Opening Supabase SQL editor in your browser...\n');
} catch (error) {
  console.log('💡 Please open the Supabase SQL editor manually.\n');
}