// Apply this fix to limit images temporarily
// This will make the app usable while you implement proper pagination

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_API_KEY
);

console.log('🔧 Applying temporary image limit fix...\n');

async function createImageView() {
  // Create a view that limits images per chat
  const query = `
    CREATE OR REPLACE VIEW limited_images AS
    SELECT * FROM (
      SELECT *,
        ROW_NUMBER() OVER (PARTITION BY chat_id ORDER BY created_at DESC) as rn
      FROM images
    ) ranked
    WHERE rn <= 50;
  `;
  
  console.log('Run this in Supabase SQL Editor:');
  console.log('```sql');
  console.log(query);
  console.log('```');
  
  console.log('\nThen update your app to query "limited_images" instead of "images" table.');
}

async function cleanupOldImages() {
  console.log('\n\nOptional: Clean up very old images');
  console.log('```sql');
  console.log('-- Delete images older than 6 months');
  console.log("DELETE FROM images WHERE created_at < NOW() - INTERVAL '6 months';");
  console.log('```');
}

createImageView();
cleanupOldImages();
