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

async function fixMultiEditImages() {
  console.log('Fixing multi-edit images in database...\n');

  try {
    // Fetch all images
    const { data: images, error } = await supabase
      .from('images')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching images:', error);
      return;
    }

    console.log(`Found ${images.length} total images\n`);

    // Filter images that are multi-edit based on model
    const multiEditImages = images.filter(img => {
      // Check for multi-edit model
      return img.model === 'flux-kontext-max-multi';
    });

    console.log(`Found ${multiEditImages.length} multi-edit images (flux-kontext-max-multi)\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    // Update each multi-edit image
    for (const image of multiEditImages) {
      console.log(`\nProcessing image ${image.id}:`);
      console.log(`- Prompt: ${image.prompt.substring(0, 50)}...`);
      console.log(`- Model: ${image.model}`);
      console.log(`- Current metadata:`, {
        isMultiImageEdit: image.metadata?.isMultiImageEdit,
        hasInputImages: !!image.metadata?.inputImages,
        inputImagesCount: image.metadata?.inputImages?.length || 0,
        hasSourceImages: !!image.metadata?.sourceImages,
        sourceImagesCount: image.metadata?.sourceImages?.length || 0
      });

      // Check if already has the flag
      if (image.metadata?.isMultiImageEdit === true) {
        console.log('✓ Already has isMultiImageEdit flag, skipping');
        skippedCount++;
        continue;
      }

      // Update metadata
      const updatedMetadata = {
        ...image.metadata,
        isMultiImageEdit: true
      };

      const { error: updateError } = await supabase
        .from('images')
        .update({ metadata: updatedMetadata })
        .eq('id', image.id);

      if (updateError) {
        console.error(`✗ Error updating image ${image.id}:`, updateError);
      } else {
        console.log(`✓ Fixed image ${image.id} - added isMultiImageEdit flag`);
        fixedCount++;
      }
    }

    console.log('\n========================================');
    console.log('Multi-edit image fix complete!');
    console.log(`Total multi-edit images: ${multiEditImages.length}`);
    console.log(`Fixed: ${fixedCount}`);
    console.log(`Skipped (already fixed): ${skippedCount}`);
    console.log('========================================\n');

    // Now check for any images that might have inputImages but wrong model
    const potentialMissedImages = images.filter(img => {
      return img.metadata?.inputImages && 
             img.metadata.inputImages.length > 1 && 
             img.model !== 'flux-kontext-max-multi';
    });

    if (potentialMissedImages.length > 0) {
      console.log(`\nFound ${potentialMissedImages.length} images with inputImages but different model:`);
      potentialMissedImages.forEach(img => {
        console.log(`- ID: ${img.id}, Model: ${img.model}, inputImages: ${img.metadata.inputImages.length}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

fixMultiEditImages();
