// Quick test after RLS fix
// Run with: node verify-fix.cjs

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_API_KEY
);

console.log('🧪 Testing if RLS fix worked...\n');

supabase
  .from('images')
  .insert({
    url: 'https://test.com/verify-' + Date.now() + '.jpg',
    prompt: 'Verification test',
    model: 'test'
  })
  .select()
  .single()
  .then(({ data, error }) => {
    if (error) {
      console.log('❌ Still failing:', error.message);
      console.log('Please make sure you ran the SQL script in Supabase');
    } else {
      console.log('✅ Success! Images can now be saved');
      console.log('Created test image with ID:', data.id);
      
      // Clean up
      supabase.from('images').delete().eq('id', data.id).then(() => {
        console.log('✅ Test image cleaned up');
        console.log('\n🎉 Your app should now work properly!');
        console.log('1. Restart your dev server: npm run dev');
        console.log('2. Try generating an image');
      });
    }
  });
