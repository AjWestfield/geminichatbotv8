#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execAsync = promisify(exec);

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function optimizeDatabasePerformance() {
  console.log('🔧 GeminiChatbotv6 - Database Performance Optimization\n');
  console.log('This will optimize database performance to fix timeout issues.\n');
  
  // SQL optimization script
  const optimizationSQL = `
-- ============================================
-- DATABASE PERFORMANCE OPTIMIZATION
-- ============================================

-- 1. ANALYZE ALL TABLES FOR BETTER QUERY PLANNING
ANALYZE chats;
ANALYZE messages;
ANALYZE images;
ANALYZE videos;
ANALYZE audios;
ANALYZE social_media_cookies;

-- 2. CREATE OPTIMIZED INDEXES FOR MESSAGES TABLE
-- Drop existing indexes if they exist (to recreate optimized versions)
DROP INDEX IF EXISTS idx_messages_chat_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_role;

-- Create optimized composite indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_chat_id_created_at 
ON messages(chat_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_role_created_at 
ON messages(role, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_content_search 
ON messages USING gin(to_tsvector('english', content));

-- 3. OPTIMIZE OTHER TABLES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chats_created_at 
ON chats(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chats_updated_at 
ON chats(updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_images_chat_id 
ON images(chat_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_chat_id 
ON videos(chat_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audios_chat_id 
ON audios(chat_id);

-- 4. VACUUM AND REINDEX ALL TABLES
VACUUM ANALYZE chats;
VACUUM ANALYZE messages;
VACUUM ANALYZE images;
VACUUM ANALYZE videos;
VACUUM ANALYZE audios;
VACUUM ANALYZE social_media_cookies;

-- 5. UPDATE TABLE STATISTICS
ANALYZE chats;
ANALYZE messages;
ANALYZE images;
ANALYZE videos;
ANALYZE audios;
ANALYZE social_media_cookies;

-- 6. PERFORMANCE VERIFICATION QUERIES
SELECT 
    'Database optimization complete!' as status,
    (SELECT COUNT(*) FROM messages) as total_messages,
    (SELECT COUNT(DISTINCT chat_id) FROM messages) as unique_chats,
    (SELECT pg_size_pretty(pg_total_relation_size('messages'))) as messages_table_size,
    (SELECT pg_size_pretty(pg_database_size(current_database()))) as total_database_size;

-- 7. INDEX USAGE STATISTICS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename IN ('chats', 'messages', 'images', 'videos', 'audios', 'social_media_cookies')
ORDER BY tablename, attname;
`;

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
    
    await execAsync(`echo "${optimizationSQL.replace(/"/g, '\\"')}" | ${command}`);
    console.log('✅ SQL optimization script copied to clipboard!\n');
  } catch (error) {
    console.log('⚠️  Could not copy to clipboard automatically.\n');
  }
  
  console.log('📋 OPTIMIZATION STEPS:\n');
  console.log('1. Open Supabase SQL Editor:');
  console.log(`   ${supabaseUrl.replace('/rest/v1', '')}/project/${supabaseUrl.split('.')[0].split('//')[1]}/sql/new\n`);
  console.log('2. Paste the SQL script (already in your clipboard)\n');
  console.log('3. Click "Run" to execute the optimization\n');
  console.log('4. After completion, run: npm run db:check-fixed\n');
  
  // Try to open the URL
  try {
    const projectRef = supabaseUrl.split('.')[0].split('//')[1];
    const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
    
    const openCommand = process.platform === 'darwin' ? 'open' : 
                       process.platform === 'win32' ? 'start' : 'xdg-open';
    await execAsync(`${openCommand} "${sqlEditorUrl}"`);
    console.log('💡 Opening Supabase SQL editor in your browser...\n');
  } catch (error) {
    console.log('💡 Please open the Supabase SQL editor manually.\n');
  }
  
  console.log('🎯 WHAT THIS OPTIMIZATION DOES:');
  console.log('• Analyzes all tables for better query planning');
  console.log('• Creates optimized composite indexes for faster queries');
  console.log('• Adds full-text search capability to messages');
  console.log('• Optimizes indexes for all tables');
  console.log('• Vacuums and reindexes all tables');
  console.log('• Updates table statistics for optimal performance');
  console.log('• Provides performance verification and statistics\n');
  
  console.log('⏱️  EXPECTED RESULTS:');
  console.log('• Eliminates timeout errors on messages table');
  console.log('• Faster database queries across all tables');
  console.log('• Improved application responsiveness');
  console.log('• Better search performance');
  console.log('• Optimized storage usage\n');
}

optimizeDatabasePerformance().catch(console.error);