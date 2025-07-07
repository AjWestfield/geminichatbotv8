import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Fixing video analysis functionality...\n');

const filePath = path.join(__dirname, '../components/chat-interface.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Add a ref to track when submission is from inline video options
const fix1 = {
  search: /const nextMessageFilesRef = useRef<{ fileUri\?: string; fileMimeType\?: string; transcription\?: any; multipleFiles\?: any\[\] } \| null>\(null\)/,
  replace: `const nextMessageFilesRef = useRef<{ fileUri?: string; fileMimeType?: string; transcription?: any; multipleFiles?: any[] } | null>(null)
  const isInlineVideoSubmissionRef = useRef<boolean>(false)`
};

// Fix 2: Set the flag when inline video options are selected
const fix2 = {
  search: /\/\/ Mark that user has interacted with options\s*setUserHasInteractedWithOptions\(true\)/,
  replace: `// Mark that user has interacted with options
    setUserHasInteractedWithOptions(true)
    
    // Mark this as an inline video submission
    isInlineVideoSubmissionRef.current = true`
};

// Fix 3: Modify the freshness check to include all files for inline video submissions
const fix3 = {
  search: /const freshFiles = filesToSend\.filter\(file => \{[\s\S]*?return true;\s*\}\);/,
  replace: `const freshFiles = filesToSend.filter(file => {
          // If this is an inline video submission, include all files
          if (isInlineVideoSubmissionRef.current) {
            console.log('[handleSubmit] Including file for inline video submission:', file.file.name);
            return true;
          }
          
          // Check if file was recently uploaded (within last 5 minutes)
          const fileAge = (file.file as any).uploadTimestamp 
            ? Date.now() - (file.file as any).uploadTimestamp 
            : 0;
          const isFresh = fileAge < 5 * 60 * 1000; // 5 minutes
          
          // Social media downloads have skipValidation flag
          const isSocialMediaDownload = (file.file as any).skipValidation === true;
          
          if (!isFresh && !isSocialMediaDownload) {
            console.warn('[handleSubmit] Excluding potentially expired file:', {
              name: file.file.name,
              age: fileAge,
              hasSkipValidation: isSocialMediaDownload
            });
            return false;
          }
          
          return true;
        });`
};

// Fix 4: Reset the flag after submission
const fix4 = {
  search: /\/\/ Call the original submit handler\s*originalHandleSubmit\(\)/,
  replace: `// Call the original submit handler
    originalHandleSubmit()
    
    // Reset the inline video submission flag
    isInlineVideoSubmissionRef.current = false`
};

// Apply fixes
let fixCount = 0;

// Apply fix 1
if (content.match(fix1.search)) {
  content = content.replace(fix1.search, fix1.replace);
  fixCount++;
  console.log('✅ Added isInlineVideoSubmissionRef');
} else {
  console.log('⚠️  Could not add isInlineVideoSubmissionRef - may already exist');
}

// Apply fix 2
if (content.match(fix2.search)) {
  content = content.replace(fix2.search, fix2.replace);
  fixCount++;
  console.log('✅ Added inline video submission flag setting');
} else {
  console.log('⚠️  Could not add flag setting - pattern not found');
}

// Apply fix 3
if (content.match(fix3.search)) {
  content = content.replace(fix3.search, fix3.replace);
  fixCount++;
  console.log('✅ Modified freshness check for inline video submissions');
} else {
  console.log('⚠️  Could not modify freshness check - pattern not found');
}

// Apply fix 4
if (content.match(fix4.search)) {
  content = content.replace(fix4.search, fix4.replace);
  fixCount++;
  console.log('✅ Added flag reset after submission');
} else {
  console.log('⚠️  Could not add flag reset - pattern not found');
}

// Write the file back
if (fixCount > 0) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`\n✅ Applied ${fixCount} fixes to ${filePath}`);
  console.log('\n🎉 Video analysis fix complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Restart your development server');
  console.log('2. Test by pasting a video URL');
  console.log('3. Click "🔍 Analyze" or "⚙️ Reverse Engineer"');
  console.log('4. The AI should now receive and process the video correctly!\n');
} else {
  console.log('\n⚠️  No fixes were applied. The code may have already been modified.');
}
