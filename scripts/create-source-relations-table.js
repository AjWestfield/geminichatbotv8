import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createImageSourceRelationsTable() {
  console.log('Creating image_source_relations table...\n');

  const sql = `
    -- Create image_source_relations table to track multi-image edit relationships
    CREATE TABLE IF NOT EXISTS image_source_relations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      edited_image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
      source_image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
      source_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      
      -- Ensure unique relationship per edited image and source order
      UNIQUE(edited_image_id, source_order)
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_image_source_relations_edited ON image_source_relations(edited_image_id);
    CREATE INDEX IF NOT EXISTS idx_image_source_relations_source ON image_source_relations(source_image_id);
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error && error.message.includes('exec_sql')) {
      console.log('The exec_sql function is not available. Please run the SQL manually in Supabase dashboard:\n');
      console.log(sql);
      console.log('\nOr save and run the file: scripts/add-image-source-relations-table.sql');
    } else if (error) {
      console.error('Error creating table:', error);
    } else {
      console.log('✓ Table created successfully!');
    }
  } catch (err) {
    console.log('Unable to execute SQL directly. Please run this SQL in your Supabase dashboard:\n');
    console.log(sql);
  }
}

createImageSourceRelationsTable();
