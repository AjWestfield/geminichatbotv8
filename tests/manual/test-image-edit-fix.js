#!/usr/bin/env node
/**
 * Manual test script for image edit URL object fix
 * 
 * Run this to test the image editing functionality:
 * node tests/manual/test-image-edit-fix.js
 */

import fetch from 'node-fetch'

async function testImageEdit() {
  console.log('🧪 Testing Image Edit Fix...\n')
  
  // First, we need a valid image URL to edit
  // You can replace this with an actual Replicate image URL
  const testImageUrl = 'https://replicate.delivery/xezq/test/sample.jpg'
  
  try {
    console.log('📤 Sending edit request...')
    const response = await fetch('http://localhost:3000/api/edit-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: testImageUrl,
        imageId: 'test_image_id',
        prompt: 'Add a blue filter',
        model: 'flux-kontext-max',
        quality: 'standard',
        style: 'vivid',
        size: '1024x1024'
      })
    })
    
    const data = await response.json()
    
    if (response.ok && data.images?.[0]?.url) {
      console.log('✅ Image edited successfully!')
      console.log(`📍 Edited URL: ${data.images[0].url}`)
      console.log(`🔍 URL type: ${typeof data.images[0].url}`)
      console.log(`📊 Metadata:`, data.metadata)
      
      // Verify the URL is a string
      if (typeof data.images[0].url === 'string') {
        console.log('✅ URL is correctly returned as a string!')
      } else {
        console.error('❌ URL is not a string!', typeof data.images[0].url)
      }
    } else {
      console.error('❌ Image editing failed:', data.error || 'Unknown error')
      console.error('Details:', data.details)
    }
  } catch (error) {
    console.error('❌ Error testing image edit:', error.message)
  }
}

// Test URL object to string conversion locally
function testUrlConversion() {
  console.log('\n🧪 Testing URL Object Conversion...\n')
  
  // Test cases
  const testCases = [
    { name: 'URL Object', value: new URL('https://example.com/image.jpg') },
    { name: 'String URL', value: 'https://example.com/image.jpg' },
    { name: 'Object with href', value: { href: 'https://example.com/image.jpg' } },
    { name: 'Null', value: null },
    { name: 'Undefined', value: undefined }
  ]
  
  testCases.forEach(test => {
    const extractUrlString = (url) => {
      return url instanceof URL ? url.href : 
             (typeof url === 'object' && url && 'href' in url) ? url.href : 
             String(url);
    }
    
    const result = extractUrlString(test.value)
    console.log(`${test.name}: ${result} (type: ${typeof result})`)
  })
}

// Run tests
async function runTests() {
  console.log('🚀 Image Edit URL Object Fix Test Suite\n')
  console.log('Make sure the dev server is running on http://localhost:3000\n')
  
  testUrlConversion()
  await testImageEdit()
  
  console.log('\n✨ Tests complete!')
  console.log('\nTo fully test:')
  console.log('1. Generate an image with Flux models')
  console.log('2. Try to edit the generated image')
  console.log('3. Check console for no ".includes is not a function" errors')
}

// Check if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error)
}