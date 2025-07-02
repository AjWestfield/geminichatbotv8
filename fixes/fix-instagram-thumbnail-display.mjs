#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

async function fixInstagramThumbnailDisplay() {
  console.log('🔧 Fixing Instagram video thumbnail display...\n');

  // Fix 1: Update chat-interface.tsx to properly handle pre-uploaded video thumbnails
  const chatInterfacePath = path.join(projectRoot, 'components/chat-interface.tsx');
  let chatInterfaceContent = await fs.readFile(chatInterfacePath, 'utf8');

  // Find the section where pendingAttachment is processed for videos
  const pendingAttachmentVideoSection = `
              // Add the primary attachment
              tempAttachments.push({
                name: pendingAttachment.name,
                contentType: pendingAttachment.contentType,
                url: pendingAttachment.url,
                transcription: pendingAttachment.transcription,
                videoThumbnail: pendingAttachment.videoThumbnail,
                videoDuration: pendingAttachment.videoDuration
              });`;

  const updatedPendingAttachmentVideoSection = `
              // Add the primary attachment
              const primaryAttachment = {
                name: pendingAttachment.name,
                contentType: pendingAttachment.contentType,
                url: pendingAttachment.url,
                transcription: pendingAttachment.transcription,
                videoThumbnail: pendingAttachment.videoThumbnail,
                videoDuration: pendingAttachment.videoDuration
              };

              // Log for debugging Instagram videos
              if (pendingAttachment.name.toLowerCase().includes('instagram') && pendingAttachment.contentType?.startsWith('video/')) {
                console.log('[Instagram Video Attachment]', {
                  name: pendingAttachment.name,
                  hasVideoThumbnail: !!pendingAttachment.videoThumbnail,
                  thumbnailLength: pendingAttachment.videoThumbnail?.length || 0,
                  thumbnailPreview: pendingAttachment.videoThumbnail?.substring(0, 100)
                });
              }

              tempAttachments.push(primaryAttachment);`;

  if (!chatInterfaceContent.includes('Instagram Video Attachment')) {
    chatInterfaceContent = chatInterfaceContent.replace(pendingAttachmentVideoSection, updatedPendingAttachmentVideoSection);
    console.log('✅ Updated pendingAttachment processing to include Instagram video debugging');
  }

  // Fix 2: Update the processFile function to preserve video thumbnails from pre-uploaded files
  const processFileVideoSection = `      // For pre-uploaded files, we might need to generate preview differently
      // since the actual file content might be minimal
      if (file.type.startsWith("video/")) {
        // Check if the file has a pre-extracted thumbnail from YouTube/Instagram
        if ((file as any).videoThumbnail) {
          console.log(\`[processFile] Using pre-extracted thumbnail for: \${file.name}\`)
          fileUpload.videoThumbnail = (file as any).videoThumbnail
        } else {
          // For videos without thumbnails, we can't generate from dummy content
          console.log(\`[processFile] No thumbnail available for pre-uploaded video: \${file.name}\`)
        }
      }`;

  const updatedProcessFileVideoSection = `      // For pre-uploaded files, we might need to generate preview differently
      // since the actual file content might be minimal
      if (file.type.startsWith("video/")) {
        // Check if the file has a pre-extracted thumbnail from YouTube/Instagram
        if ((file as any).videoThumbnail) {
          console.log(\`[processFile] Using pre-extracted thumbnail for: \${file.name}\`, {
            thumbnailLength: (file as any).videoThumbnail?.length || 0,
            isDataUrl: (file as any).videoThumbnail?.startsWith('data:'),
            thumbnailPreview: (file as any).videoThumbnail?.substring(0, 100)
          })
          fileUpload.videoThumbnail = (file as any).videoThumbnail
          // Also ensure it's set on the pendingAttachment
          fileUpload.preview = (file as any).videoThumbnail
        } else {
          // For videos without thumbnails, we can't generate from dummy content
          console.log(\`[processFile] No thumbnail available for pre-uploaded video: \${file.name}\`)
        }
      }`;

  chatInterfaceContent = chatInterfaceContent.replace(processFileVideoSection, updatedProcessFileVideoSection);
  console.log('✅ Enhanced processFile to better handle pre-uploaded video thumbnails');

  // Fix 3: Update handleFileSelect to ensure video thumbnails are preserved
  const handleFileSelectPendingSection = `        videoDuration: fileUpload.videoDuration
      }`;

  const updatedHandleFileSelectPendingSection = `        videoDuration: fileUpload.videoDuration,
        // Ensure videoThumbnail is preserved from pre-uploaded Instagram videos
        ...(fileUpload.videoThumbnail && { videoThumbnail: fileUpload.videoThumbnail })
      }`;

  if (!chatInterfaceContent.includes('Ensure videoThumbnail is preserved')) {
    chatInterfaceContent = chatInterfaceContent.replace(handleFileSelectPendingSection, updatedHandleFileSelectPendingSection);
    console.log('✅ Updated handleFileSelect to preserve video thumbnails');
  }

  await fs.writeFile(chatInterfacePath, chatInterfaceContent);
  console.log('✅ Updated chat-interface.tsx\n');

  // Fix 4: Update animated-ai-input.tsx to ensure thumbnails are passed through
  const animatedInputPath = path.join(projectRoot, 'components/ui/animated-ai-input.tsx');
  let animatedInputContent = await fs.readFile(animatedInputPath, 'utf8');

  // Add more detailed logging in handleInstagramDownload
  const handleInstagramLogSection = `      console.log('[Instagram Download] Mock file created:', {
        fileName: mockFile.name,
        fileType: mockFile.type,
        fileSize: mockFile.size,
        hasVideoThumbnail: !!(mockFile as any).videoThumbnail,
        thumbnailLength: (mockFile as any).videoThumbnail?.length || 0,
        hasGeminiFile: !!(mockFile as any).geminiFile,
        geminiUri: (mockFile as any).geminiFile?.uri,
        isPreUploaded: (mockFile as any).isPreUploaded
      })`;

  const updatedHandleInstagramLogSection = `      console.log('[Instagram Download] Mock file created:', {
        fileName: mockFile.name,
        fileType: mockFile.type,
        fileSize: mockFile.size,
        hasVideoThumbnail: !!(mockFile as any).videoThumbnail,
        thumbnailLength: (mockFile as any).videoThumbnail?.length || 0,
        thumbnailDataUrl: (mockFile as any).videoThumbnail?.substring(0, 100),
        hasGeminiFile: !!(mockFile as any).geminiFile,
        geminiUri: (mockFile as any).geminiFile?.uri,
        isPreUploaded: (mockFile as any).isPreUploaded
      })
      
      // Additional verification for video thumbnails
      if (mockFile.type.startsWith('video/') && !(mockFile as any).videoThumbnail) {
        console.warn('[Instagram Download] WARNING: Video file created without thumbnail!', {
          downloadResult: {
            hasThumbnail: !!result.thumbnail,
            thumbnailLength: result.thumbnail?.length || 0
          }
        })
      }`;

  animatedInputContent = animatedInputContent.replace(handleInstagramLogSection, updatedHandleInstagramLogSection);
  await fs.writeFile(animatedInputPath, animatedInputContent);
  console.log('✅ Enhanced Instagram download logging in animated-ai-input.tsx\n');

  // Fix 5: Create a utility function to validate and fix video thumbnails
  const videoThumbnailUtilPath = path.join(projectRoot, 'lib/video-thumbnail-utils.ts');
  const videoThumbnailUtilContent = `/**
 * Utility functions for handling video thumbnails
 */

/**
 * Validates if a thumbnail data URL is valid
 */
export function isValidThumbnailDataUrl(dataUrl: string | undefined): boolean {
  if (!dataUrl) return false;
  
  // Check if it's a valid data URL
  if (!dataUrl.startsWith('data:')) return false;
  
  // Check if it has actual content (not just the header)
  const [header, data] = dataUrl.split(',');
  if (!header || !data || data.length < 100) return false;
  
  // Check if it's an image type
  if (!header.includes('image/')) return false;
  
  return true;
}

/**
 * Extracts thumbnail from video file metadata if available
 */
export async function extractThumbnailFromVideoMetadata(file: File): Promise<string | null> {
  try {
    // For Instagram videos that have thumbnails in metadata
    if ((file as any).videoThumbnail && isValidThumbnailDataUrl((file as any).videoThumbnail)) {
      console.log('[extractThumbnailFromVideoMetadata] Found valid thumbnail in file metadata');
      return (file as any).videoThumbnail;
    }
    
    // For Instagram API responses that include thumbnail
    if ((file as any).thumbnail && isValidThumbnailDataUrl((file as any).thumbnail)) {
      console.log('[extractThumbnailFromVideoMetadata] Found valid thumbnail in file.thumbnail');
      return (file as any).thumbnail;
    }
    
    return null;
  } catch (error) {
    console.error('[extractThumbnailFromVideoMetadata] Error:', error);
    return null;
  }
}

/**
 * Ensures video file has a valid thumbnail
 */
export function ensureVideoThumbnail(file: File & { videoThumbnail?: string }): void {
  if (file.type.startsWith('video/') && !isValidThumbnailDataUrl(file.videoThumbnail)) {
    console.warn('[ensureVideoThumbnail] Video file missing valid thumbnail:', {
      fileName: file.name,
      hasVideoThumbnail: !!file.videoThumbnail,
      thumbnailLength: file.videoThumbnail?.length || 0
    });
    
    // Check alternative locations for thumbnail
    const alternativeThumbnail = (file as any).thumbnail || (file as any).preview;
    if (isValidThumbnailDataUrl(alternativeThumbnail)) {
      file.videoThumbnail = alternativeThumbnail;
      console.log('[ensureVideoThumbnail] Found thumbnail in alternative location');
    }
  }
}
`;

  await fs.writeFile(videoThumbnailUtilPath, videoThumbnailUtilContent);
  console.log('✅ Created video-thumbnail-utils.ts\n');

  console.log('🎉 Instagram video thumbnail display fixes applied successfully!\n');
  console.log('Next steps:');
  console.log('1. Restart your development server');
  console.log('2. Test by pasting an Instagram video URL');
  console.log('3. Check browser console for detailed thumbnail logging');
  console.log('4. Verify that video thumbnails are displayed correctly\n');
  
  console.log('Troubleshooting tips:');
  console.log('- Look for [Instagram Video Attachment] logs in the console');
  console.log('- Check if thumbnail data URLs are being passed correctly');
  console.log('- Verify that the thumbnail is a valid data URL (starts with data:image/)');
}

// Run the fix
fixInstagramThumbnailDisplay().catch(console.error);
