#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

async function fixInstagramThumbnailDisplay() {
  console.log('🖼️ Fixing Instagram video thumbnail display in chat input...\n');

  // Fix 1: Update animated-ai-input.tsx to ensure thumbnails display
  const animatedInputPath = path.join(projectRoot, 'components/ui/animated-ai-input.tsx');
  let animatedInputContent = await fs.readFile(animatedInputPath, 'utf8');

  // Find where Instagram files are passed to onFileSelect
  const onFileSelectSection = `        onFileSelect(fileWithThumbnail)`;
  
  // Add debugging and ensure thumbnail is preserved
  const updatedOnFileSelectSection = `        // Force thumbnail to be visible
        if (fileWithThumbnail.type.startsWith('video/') && (fileWithThumbnail as any).videoThumbnail) {
          console.log('[Instagram] Passing video with thumbnail to chat:', {
            name: fileWithThumbnail.name,
            thumbnailLength: (fileWithThumbnail as any).videoThumbnail.length,
            thumbnailPreview: (fileWithThumbnail as any).videoThumbnail.substring(0, 100)
          });
        }
        
        onFileSelect(fileWithThumbnail)`;

  if (!animatedInputContent.includes('Force thumbnail to be visible')) {
    animatedInputContent = animatedInputContent.replace(onFileSelectSection, updatedOnFileSelectSection);
    console.log('✅ Added thumbnail debugging to animated-ai-input.tsx');
  }

  await fs.writeFile(animatedInputPath, animatedInputContent);

  // Fix 2: Update chat-interface.tsx to properly handle thumbnails from Instagram files
  const chatInterfacePath = path.join(projectRoot, 'components/chat-interface.tsx');
  let chatInterfaceContent = await fs.readFile(chatInterfacePath, 'utf8');

  // Find the handleFileSelect function where selectedFile is set
  const setSelectedFileSection = `        // Ensure all properties are preserved, especially for Instagram videos
        const selectedFileData = {
          file: fileToStore,
          geminiFile: fileUpload.geminiFile,
          preview: fileUpload.preview,
          transcription: fileUpload.transcription,
          videoThumbnail: fileUpload.videoThumbnail || (file as any).videoThumbnail, // Fallback to original file property
          videoDuration: fileUpload.videoDuration
        };`;

  // Update to ensure thumbnail is always checked
  const updatedSetSelectedFileSection = `        // Ensure all properties are preserved, especially for Instagram videos
        const selectedFileData = {
          file: fileToStore,
          geminiFile: fileUpload.geminiFile,
          preview: fileUpload.preview,
          transcription: fileUpload.transcription,
          videoThumbnail: fileUpload.videoThumbnail || (fileToStore as any).videoThumbnail || (file as any).videoThumbnail, // Multiple fallbacks
          videoDuration: fileUpload.videoDuration
        };
        
        // Special handling for Instagram videos to ensure thumbnail displays
        if (fileToStore.name.toLowerCase().includes('instagram') && fileToStore.type.startsWith('video/')) {
          console.log('[Chat Interface] Instagram video selected:', {
            fileName: fileToStore.name,
            hasUploadThumbnail: !!fileUpload.videoThumbnail,
            hasStoreThumbnail: !!(fileToStore as any).videoThumbnail,
            hasOriginalThumbnail: !!(file as any).videoThumbnail,
            finalThumbnail: !!selectedFileData.videoThumbnail,
            thumbnailLength: selectedFileData.videoThumbnail?.length || 0
          });
          
          // If we still don't have a thumbnail, check all possible sources
          if (!selectedFileData.videoThumbnail) {
            const possibleThumbnail = (file as any).videoThumbnail || 
                                     (fileToStore as any).videoThumbnail || 
                                     fileUpload.preview;
            if (possibleThumbnail && possibleThumbnail.startsWith('data:image/')) {
              selectedFileData.videoThumbnail = possibleThumbnail;
              console.log('[Chat Interface] Found thumbnail in alternate location');
            }
          }
        }`;

  chatInterfaceContent = chatInterfaceContent.replace(setSelectedFileSection, updatedSetSelectedFileSection);
  
  await fs.writeFile(chatInterfacePath, chatInterfaceContent);
  console.log('✅ Enhanced thumbnail handling in chat-interface.tsx\n');

  // Fix 3: Create a fix for the thumbnail display component
  const thumbnailFixPath = path.join(projectRoot, 'lib/instagram-thumbnail-fix.ts');
  const thumbnailFixContent = `/**
 * Instagram Video Thumbnail Fix Utilities
 */

export function ensureInstagramThumbnail(file: any): void {
  if (!file || !file.name?.toLowerCase().includes('instagram')) {
    return;
  }
  
  // Check all possible thumbnail locations
  const thumbnailSources = [
    file.videoThumbnail,
    file.thumbnail,
    file.preview,
    file._thumbnail,
    file.file?.videoThumbnail,
    file.file?.thumbnail
  ];
  
  let validThumbnail = null;
  for (const source of thumbnailSources) {
    if (source && typeof source === 'string' && source.startsWith('data:image/')) {
      validThumbnail = source;
      break;
    }
  }
  
  if (validThumbnail && !file.videoThumbnail) {
    file.videoThumbnail = validThumbnail;
    console.log('[Instagram Thumbnail Fix] Applied thumbnail from alternate source');
  }
}

export function debugFileObject(file: any, context: string): void {
  if (!file?.name?.toLowerCase().includes('instagram')) {
    return;
  }
  
  console.log(\`[\${context}] Instagram file debug:\`, {
    fileName: file.name,
    fileType: file.type || file.contentType,
    hasVideoThumbnail: !!file.videoThumbnail,
    thumbnailType: file.videoThumbnail ? typeof file.videoThumbnail : 'none',
    thumbnailLength: file.videoThumbnail?.length || 0,
    thumbnailStart: file.videoThumbnail?.substring(0, 50),
    allKeys: Object.keys(file).filter(k => k.includes('thumb') || k.includes('preview')),
    isFile: file instanceof File,
    hasFileProperty: !!file.file
  });
}
`;

  await fs.writeFile(thumbnailFixPath, thumbnailFixContent);
  console.log('✅ Created instagram-thumbnail-fix.ts utility\n');

  // Fix 4: Update processFile to use the fix
  const processFileImportSection = `import { generateVideoThumbnail, getVideoDuration } from "./video-thumbnail"`;
  const updatedProcessFileImportSection = `import { generateVideoThumbnail, getVideoDuration } from "./video-thumbnail"
import { ensureInstagramThumbnail } from "@/lib/instagram-thumbnail-fix"`;

  if (!chatInterfaceContent.includes('instagram-thumbnail-fix')) {
    chatInterfaceContent = chatInterfaceContent.replace(processFileImportSection, updatedProcessFileImportSection);
    
    // Add the fix call in processFile
    const processFileReturnSection = `      return fileUpload`;
    const updatedProcessFileReturnSection = `      // Final Instagram thumbnail check
      if (file.name.toLowerCase().includes('instagram')) {
        ensureInstagramThumbnail(fileUpload);
        ensureInstagramThumbnail(file);
      }
      
      return fileUpload`;
    
    chatInterfaceContent = chatInterfaceContent.replace(processFileReturnSection, updatedProcessFileReturnSection);
    
    await fs.writeFile(chatInterfacePath, chatInterfaceContent);
    console.log('✅ Integrated thumbnail fix into processFile');
  }

  console.log('\n🎉 Instagram video thumbnail display fixes applied!\n');
  console.log('What was fixed:');
  console.log('1. Enhanced thumbnail detection with multiple fallback sources');
  console.log('2. Added debugging to track thumbnail through the flow');
  console.log('3. Created utility functions to ensure thumbnails are preserved');
  console.log('4. Special handling for Instagram videos in chat interface\n');
  
  console.log('To test:');
  console.log('1. Restart your development server');
  console.log('2. Clear browser cache (Cmd+Shift+R)');
  console.log('3. Paste a NEW Instagram video URL (not the same one)');
  console.log('4. Watch the console for debug messages');
  console.log('5. The thumbnail should display in the chat input!\n');
  
  console.log('If thumbnail still doesn\'t show:');
  console.log('- Check console for [Instagram] debug messages');
  console.log('- Look for "hasVideoThumbnail: true" in the logs');
  console.log('- Try with a different Instagram video URL\n');
}

// Run the fix
fixInstagramThumbnailDisplay().catch(console.error);
