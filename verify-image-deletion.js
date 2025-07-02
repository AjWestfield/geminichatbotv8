// Simple test to verify image deletion is working
// ES Module compatible version

import http from 'http'

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    }

    const req = http.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve({ status: res.statusCode, data: jsonData })
        } catch (e) {
          resolve({ status: res.statusCode, data: data })
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.end()
  })
}

async function testImageDeletion() {
  console.log('\n🧪 TESTING IMAGE DELETION FIX')
  console.log('================================\n')

  // Step 1: Check if server is running
  try {
    const checkResponse = await makeRequest('/api/check-persistence')
    console.log('✅ Server is running')
  } catch (error) {
    console.error('❌ Cannot connect to server:', error.message)
    console.error('Please make sure the server is running on port 3000')
    return
  }

  // Step 2: Test with different ID formats
  const testCases = [
    {
      name: 'Local ID format (non-existent)',
      id: 'img_test123',
      expected: 404
    },
    {
      name: 'UUID format (non-existent)',
      id: '123e4567-e89b-12d3-a456-426614174000',
      expected: 404
    }
  ]

  for (const testCase of testCases) {
    console.log(`\n📝 Testing: ${testCase.name}`)
    console.log(`   ID: ${testCase.id}`)

    try {
      const response = await makeRequest(`/api/images/${encodeURIComponent(testCase.id)}`, 'DELETE')

      console.log(`   Response status: ${response.status}`)
      console.log(`   Response:`, JSON.stringify(response.data, null, 2))

      if (response.status === testCase.expected) {
        console.log(`   ✅ Got expected status ${testCase.expected}`)
      } else {
        console.log(`   ⚠️  Expected status ${testCase.expected}, got ${response.status}`)
      }
    } catch (error) {
      console.error(`   ❌ Error:`, error.message)
    }
  }

  console.log('\n📋 MANUAL TEST INSTRUCTIONS:')
  console.log('1. Generate an image in the chat (e.g., "Create an image of a sunset")')
  console.log('2. Go to Canvas → Images tab')
  console.log('3. Look for the image ID in the browser console when you hover over it')
  console.log('4. Run: node verify-image-deletion.js <imageId>')
  console.log('5. Check the server terminal for detailed [API] and [DELETE IMAGE] logs')
  console.log('\nThe fix is working if:')
  console.log('- You see detailed logging about ID lookup attempts')
  console.log('- The image is successfully deleted from the gallery')
  console.log('- You get a success response with status 200')
  console.log('\n🔍 Look for these logs in your server terminal:')
  console.log('   [API] DELETE /api/images/[id] - Starting deletion process')
  console.log('   [API] Not a UUID, searching for image by local ID...')
  console.log('   [API] Found image by local ID, database UUID: ...')
  console.log('   [DELETE IMAGE] Successfully deleted from database')
}

// Check if an image ID was provided as argument
const imageId = process.argv[2]

if (imageId) {
  console.log(`\n🎯 Testing deletion of specific image: ${imageId}`)
  
  makeRequest(`/api/images/${encodeURIComponent(imageId)}`, 'DELETE')
    .then(response => {
      console.log(`\nResponse status: ${response.status}`)
      console.log('Response data:', JSON.stringify(response.data, null, 2))
      
      if (response.status === 200) {
        console.log('\n✅ Image deleted successfully!')
        console.log('Check your gallery to confirm the image is gone.')
      } else {
        console.log('\n❌ Deletion failed')
        console.log('Check the server logs for detailed error information.')
        console.log('Look for [API] and [DELETE IMAGE] messages.')
      }
    })
    .catch(error => {
      console.error('\n❌ Error:', error.message)
    })
} else {
  // Run general tests
  testImageDeletion()
}
