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

async function diagnoseMultiEditImages() {
  console.log('Diagnosing multi-edit images...\n');

  try {
    // Fetch multi-edit images
    const { data: images, error } = await supabase
      .from('images')
      .select('*')
      .eq('model', 'flux-kontext-max-multi')
      .limit(2)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching images:', error);
      return;
    }

    console.log(`Found ${images.length} recent multi-edit images\n`);

    // Analyze each image
    for (const image of images) {
      console.log('========================================');
      console.log(`Image ID: ${image.id}`);
      console.log(`Created: ${new Date(image.created_at).toLocaleString()}`);
      console.log(`Model: ${image.model}`);
      console.log(`Prompt: ${image.prompt.substring(0, 100)}...`);
      console.log('\nKey properties:');
      console.log(`- isMultiImageEdit: ${image.metadata?.isMultiImageEdit}`);
      console.log(`- isMultiImageComposition: ${image.metadata?.isMultiImageComposition}`);
      console.log(`- inputImages: ${image.metadata?.inputImages ? `Array(${image.metadata.inputImages.length})` : 'missing'}`);
      console.log(`- sourceImages: ${image.metadata?.sourceImages ? `Array(${image.metadata.sourceImages.length})` : 'missing'}`);
      console.log(`- sourceImageIds: ${image.metadata?.sourceImageIds ? `Array(${image.metadata.sourceImageIds.length})` : 'missing'}`);
      console.log(`- sourceImageCount: ${image.metadata?.sourceImageCount || 'missing'}`);
    }

    // Also check for source relations
    console.log('\n\n========================================');
    console.log('Checking image_source_relations table...\n');

    const { data: relations, error: relError } = await supabase
      .from('image_source_relations')
      .select('*')
      .limit(3);

    if (relError) {
      console.log('Error fetching relations:', relError);
    } else {
      console.log(`Found ${relations?.length || 0} source relations`);
      if (relations && relations.length > 0) {
        console.log('\nSample relations:');
        relations.slice(0, 3).forEach(rel => {
          console.log(`- Edited: ${rel.edited_image_id} -> Source: ${rel.source_image_id} (order: ${rel.source_order})`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

diagnoseMultiEditImages();
