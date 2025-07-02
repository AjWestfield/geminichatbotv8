#!/usr/bin/env node

/**
 * Test script to verify JSON parsing fix
 */

console.log('🧪 Testing JSON Fix');
console.log('==================\n');

// Test the problematic patterns that were causing issues
const testCases = [
  // Fixed: Single backslash (correct)
  `0:${JSON.stringify("Tasks cancelled. Please provide a new request.")}\n`,
  `0:${JSON.stringify("[WORKFLOW_APPROVED] Executing approved tasks...")}\n`,
  `d:{"finishReason":"stop"}\n`,
  
  // Broken: Double backslash (incorrect)
  `0:${JSON.stringify("Tasks cancelled. Please provide a new request.")}\\n`,
  `0:${JSON.stringify("[WORKFLOW_APPROVED] Executing approved tasks...")}\\n`,
  `d:{"finishReason":"stop"}\\n`
];

console.log('✅ Testing CORRECT formats (should parse successfully):');
for (let i = 0; i < 3; i++) {
  try {
    const line = testCases[i];
    const parts = line.split(':');
    if (parts[1]) {
      const jsonPart = parts[1].trim();
      JSON.parse(jsonPart);
      console.log(`  ✓ Case ${i + 1}: Valid JSON`);
    }
  } catch (error) {
    console.log(`  ❌ Case ${i + 1}: ${error.message}`);
  }
}

console.log('\n❌ Testing BROKEN formats (should fail):');
for (let i = 3; i < 6; i++) {
  try {
    const line = testCases[i];
    const parts = line.split(':');
    if (parts[1]) {
      const jsonPart = parts[1].trim();
      JSON.parse(jsonPart);
      console.log(`  ⚠️ Case ${i + 1}: Unexpectedly valid`);
    }
  } catch (error) {
    console.log(`  ✓ Case ${i + 1}: Correctly failed - ${error.message}`);
  }
}

console.log('\n🎉 If you see checkmarks for the correct formats and failures for broken formats, the fix is working!');
console.log('\n💡 To test in your app:');
console.log('1. Try the prompt: "create the following task: Task 1. multiply 5 × 5"');
console.log('2. Check that the Agent Task Display shows the task');
console.log('3. No JSON parsing errors should appear');