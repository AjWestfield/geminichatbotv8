#!/usr/bin/env node

/**
 * Test different prompts with the multi-image edit feature
 * to understand how the model interprets various instructions
 */

const TEST_PROMPTS = [
  // Split-screen prompts (should work well)
  "Create a side-by-side comparison",
  "Show both images next to each other",
  "Make a before and after layout",
  "Create a split-screen view",
  "Display both images in a collage",
  
  // Composite prompts (will likely create split-screen anyway)
  "Put the man with the hat at the beach with the other man",
  "Merge both subjects into one scene",
  "Combine these images seamlessly",
  "Place both people in the same location",
  "Create a single scene with both subjects"
];

console.log("Multi-Image Edit Prompt Testing Guide");
console.log("=====================================\n");

console.log("The WaveSpeed Flux Kontext Max Multi model creates split-screen layouts by default.");
console.log("Test these prompts to see how the model interprets different instructions:\n");

console.log("PROMPTS THAT SHOULD WORK WELL:");
console.log("------------------------------");
TEST_PROMPTS.slice(0, 5).forEach((prompt, i) => {
  console.log(`${i + 1}. "${prompt}"`);
});

console.log("\nPROMPTS THAT WILL CREATE SPLIT-SCREEN (not true composites):");
console.log("-----------------------------------------------------------");
TEST_PROMPTS.slice(5).forEach((prompt, i) => {
  console.log(`${i + 6}. "${prompt}"`);
});

console.log("\nEXPECTED RESULTS:");
console.log("-----------------");
console.log("✅ All prompts will create split-screen or side-by-side layouts");
console.log("✅ Images will have white borders or clear separation");
console.log("❌ No true scene merging or seamless compositing");
console.log("❌ Subjects won't be placed together in the same scene");

console.log("\nRECOMMENDATION:");
console.log("---------------");
console.log("Use this feature for:");
console.log("- Before/after comparisons");
console.log("- Style comparisons");
console.log("- Visual collections");
console.log("- Split-screen presentations");
console.log("\nDo NOT use for:");
console.log("- Seamless object compositing");
console.log("- Placing subjects together in one scene");
console.log("- True image merging");
