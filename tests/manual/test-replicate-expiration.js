#!/usr/bin/env node
/**
 * Manual test script for Replicate URL expiration handling
 * 
 * Run this to test the expired URL handling:
 * node tests/manual/test-replicate-expiration.js
 */

import fetch from 'node-fetch'
import { validateImageUrl } from '../../lib/image-url-validator.js'

const TEST_CASES = [
  {
    name: 'Valid Replicate URL',
    url: 'https://replicate.delivery/xezq/valid-test/image.jpg',
    expectedValid: true
  },
  {
    name: 'Expired Replicate URL (404)',
    url: 'https://replicate.delivery/xezq/f6SaVQIcou0raqwA0LJGILFzK31PUQyfpOsobKduT4BrGx4UA/tmph82l0jop.jpg',
    expectedValid: false
  },
  {
    name: 'Blob Storage URL',
    url: 'https://example.blob.vercel-storage.com/images/test.jpg',
    expectedValid: true
  }
]

async function testImageGeneration() {
  console.log('🧪 Testing Image Generation with Auto-Upload...\n')
  
  try {
    const response = await fetch('http://localhost:3000/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'A beautiful sunset over mountains',
        model: 'flux-kontext-pro',
        quality: 'standard',
        style: 'vivid',
        size: '1024x1024'
      })
    })
    
    const data = await response.json()
    
    if (response.ok && data.images?.[0]?.url) {
      console.log('✅ Image generated successfully')
      console.log(`📍 URL: ${data.images[0].url}`)
      console.log(`🗄️  Blob uploaded: ${data.metadata?.blobUploaded ? 'Yes' : 'No'}`)
      
      // Check if it's a blob URL
      if (data.images[0].url.includes('blob.vercel-storage.com')) {
        console.log('✅ Image was automatically uploaded to blob storage!')
      } else if (data.images[0].url.includes('replicate.delivery')) {
        console.log('⚠️  Image is still using Replicate URL (blob storage might not be configured)')
      }
    } else {
      console.error('❌ Image generation failed:', data.error)
    }
  } catch (error) {
    console.error('❌ Error testing image generation:', error.message)
  }
}

async function testURLValidation() {
  console.log('\n🧪 Testing URL Validation...\n')
  
  for (const testCase of TEST_CASES) {
    try {
      console.log(`Testing: ${testCase.name}`)
      console.log(`URL: ${testCase.url}`)
      
      const isValid = await validateImageUrl(testCase.url)
      const passed = isValid === testCase.expectedValid
      
      console.log(`Result: ${isValid ? 'Valid' : 'Invalid'}`)
      console.log(`${passed ? '✅ PASS' : '❌ FAIL'} - Expected ${testCase.expectedValid ? 'valid' : 'invalid'}\n`)
    } catch (error) {
      console.error(`❌ Error testing ${testCase.name}:`, error.message, '\n')
    }
  }
}

async function testImageEditing(imageUrl) {
  console.log('\n🧪 Testing Image Editing with Expired URL Handling...\n')
  
  try {
    const response = await fetch('http://localhost:3000/api/edit-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: imageUrl || 'https://replicate.delivery/xezq/expired-test/image.jpg',
        prompt: 'Add snow to the scene',
        model: 'flux-kontext-pro',
        quality: 'standard',
        style: 'vivid',
        size: '1024x1024'
      })
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Image edited successfully')
      console.log(`📍 Edited URL: ${data.images?.[0]?.url}`)
      console.log(`🗄️  Blob uploaded: ${data.metadata?.blobUploaded ? 'Yes' : 'No'}`)
    } else {
      console.log('❌ Image editing failed (expected for expired URLs)')
      console.log(`Error: ${data.error}`)
      console.log(`Details: ${data.details}`)
      
      if (data.details?.includes('expired')) {
        console.log('✅ Proper expiration error message displayed')
      }
    }
  } catch (error) {
    console.error('❌ Error testing image editing:', error.message)
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Replicate URL Expiration Test Suite\n')
  console.log('Make sure the dev server is running on http://localhost:3000\n')
  
  await testURLValidation()
  await testImageGeneration()
  await testImageEditing()
  
  console.log('\n✨ Tests complete!')
  console.log('\nNext steps:')
  console.log('1. Run migration for existing images: npm run migrate:replicate-images:dry-run')
  console.log('2. Test editing recently generated images in the UI')
  console.log('3. Monitor logs for blob upload confirmations')
}

// Check if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error)
}