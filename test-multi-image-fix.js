#!/usr/bin/env node

/**
 * Test script for multi-image edit fix
 * Run with: node test-multi-image-fix.js
 */

const fs = require('fs');
const path = require('path');

// Test the multi-image edit endpoint
async function testMultiImageEdit() {
  const baseUrl = 'http://localhost:3000'; // Adjust port if needed
  
  // Test data - you can replace these with actual image URLs
  const testImages = [
    'https://replicate.delivery/xezq/TlfNs8Ie26iIykV5jM...',  // This will likely fail
    'https://replicate.delivery/xezq/f6SaVQIcou0raqwA0L...'   // This will likely fail
  ];
  
  const testPrompt = 'The man with the hat is at the beach with the man in the blue jacket';
  
  console.log('Testing multi-image edit API...\n');
  console.log('Test images:', testImages);
  console.log('Test prompt:', testPrompt);
  console.log('\n' + '='.repeat(50) + '\n');
  
  try {
    const response = await fetch(`${baseUrl}/api/edit-multi-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: testImages,
        prompt: testPrompt,
        guidanceScale: 3.5,
        safetyTolerance: '2'
      })
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Multi-image edit completed successfully!');
      if (data.images && data.images[0]) {
        console.log('Generated image URL:', data.images[0].url);
      }
    } else {
      console.log('\n❌ Multi-image edit failed');
      console.log('Error:', data.error);
      console.log('Details:', data.details);
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
  }
}

// Test with local base64 images (more reliable)
async function testWithBase64Images() {
  console.log('\n' + '='.repeat(50));
  console.log('Testing with base64 images...\n');
  
  // Create simple test images
  const canvas = require('canvas');
  const createCanvas = canvas.createCanvas;
  
  function createTestImage(color, text) {
    const canv = createCanvas(200, 200);
    const ctx = canv.getContext('2d');
    
    // Fill background
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 200, 200);
    
    // Add text
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(text, 50, 100);
    
    return canv.toDataURL();
  }
  
  const testImages = [
    createTestImage('red', 'Image 1'),
    createTestImage('blue', 'Image 2')
  ];
  
  const response = await fetch('http://localhost:3000/api/edit-multi-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      images: testImages,
      prompt: 'Combine these two images into a single artistic composition',
      guidanceScale: 3.5,
      safetyTolerance: '2'
    })
  });
  
  const data = await response.json();
  console.log('Base64 test response:', response.status);
  console.log('Base64 test data:', JSON.stringify(data, null, 2));
}

// Run tests
(async () => {
  console.log('Multi-Image Edit Fix Test Script');
  console.log('================================\n');
  
  // Test with the problematic URLs first
  await testMultiImageEdit();
  
  // Uncomment to test with base64 images (requires canvas package)
  // await testWithBase64Images();
  
  console.log('\n\nTest complete!');
})();
