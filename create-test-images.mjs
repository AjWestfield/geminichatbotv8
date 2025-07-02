import { writeFileSync } from 'fs'

// Create a simple test image (1x1 red pixel PNG)
const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const buffer = Buffer.from(base64Image, 'base64')

writeFileSync('test-image-red.png', buffer)
console.log('✅ Created test-image-red.png - a 1x1 red pixel image for testing')

// Create a larger test image (100x100 blue square)
const canvas = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="#4A90E2"/>
  <text x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-family="Arial" font-size="14">TEST</text>
</svg>`

const svgBuffer = Buffer.from(canvas)
writeFileSync('test-image-blue.svg', svgBuffer)
console.log('✅ Created test-image-blue.svg - a 100x100 blue square with "TEST" text')

console.log('\n📁 You can use these test images to verify the upload persistence fix!')
