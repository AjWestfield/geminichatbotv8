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
  console.log('Fixing multi-edit images in database...');

  try {
    // Fetch all images
    const { data: images, error } = await supabase
      .from('images')
      .select('*');

    if (error) {
      console.error('Error fetching images:', error);
      return;
    }

    console.log(`Found ${images.length} total images`);

    // Filter images that might be multi-edit based on their metadata
    const multiEditImages = images.filter(img => {
      // Check if metadata has sourceImages or inputImages
      return img.metadata && 
        (img.metadata.sourceImages || img.metadata.inputImages || 
         img.model === 'flux-kontext-max-multi' || 
         img.prompt?.toLowerCase().includes('combine') ||
         img.prompt?.toLowerCase().includes('multi'));
    });

    console.log(`Found ${multiEditImages.length} potential multi-edit images`);

    // Update each multi-edit image
    for (const image of multiEditImages) {
      const updates = {};
      let needsUpdate = false;

      // Add isMultiImageEdit flag if missing
      if (image.metadata.inputImages && !image.metadata.isMultiImageEdit) {
        updates.isMultiImageEdit = true;
        needsUpdate = true;
      }

      // Fix metadata if needed
      if (needsUpdate) {
        const updatedMetadata = {
          ...image.metadata,
          ...updates
        };

        const { error: updateError } = await supabase
          .from('images')
          .update({ metadata: updatedMetadata })
          .eq('id', image.id);

        if (updateError) {
          console.error(`Error updating image ${image.id}:`, updateError);
        } else {
          console.log(`✓ Fixed image ${image.id} - added isMultiImageEdit flag`);
        }
      }
    }

    console.log('Multi-edit image fix complete!');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixMultiEditImages();
