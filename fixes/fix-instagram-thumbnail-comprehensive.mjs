#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

async function fixInstagramVideoThumbnailComprehensive() {
  console.log('🔧 Comprehensive Instagram Video Thumbnail Fix...\n');

  // Fix 1: Update createFileFromInstagramDownload to ensure thumbnail is properly attached
  const instagramUtilsPath = path.join(projectRoot, 'lib/instagram-url-utils.ts');
  let instagramUtilsContent = await fs.readFile(instagramUtilsPath, 'utf8');

  // Find the createFileFromInstagramDownload function
  const createFileSection = `  // Add video thumbnail if available
  if (downloadResult.thumbnail) {
    Object.defineProperty(mockFile, 'videoThumbnail', {
      value: downloadResult.thumbnail,
      writable: false
    })
    console.log('[createFileFromInstagramDownload] Added videoThumbnail:', downloadResult.thumbnail.substring(0, 50) + '...')
  } else {
    console.log('[createFileFromInstagramDownload] No thumbnail available in downloadResult')
  }`;

  const updatedCreateFileSection = `  // Add video thumbnail if available
  if (downloadResult.thumbnail) {
    // Ensure the thumbnail is a valid data URL
    if (downloadResult.thumbnail.startsWith('data:image/')) {
      Object.defineProperty(mockFile, 'videoThumbnail', {
        value: downloadResult.thumbnail,
        writable: true,  // Make it writable so it can be preserved through processing
        enumerable: true, // Make it enumerable so it shows up in object spread
        configurable: true
      });
      
      // Also add it as a regular property for better compatibility
      (mockFile as any).videoThumbnail = downloadResult.thumbnail;
      
      console.log('[createFileFromInstagramDownload] Added videoThumbnail:', {
        length: downloadResult.thumbnail.length,
        preview: downloadResult.thumbnail.substring(0, 100) + '...',
        isDataUrl: downloadResult.thumbnail.startsWith('data:image/')
      });
    } else {
      console.warn('[createFileFromInstagramDownload] Thumbnail is not a valid data URL:', downloadResult.thumbnail.substring(0, 100));
    }
  } else {
    console.log('[createFileFromInstagramDownload] No thumbnail available in downloadResult');
  }
  
  // Add a flag to help debug the flow
  Object.defineProperty(mockFile, '_isInstagramVideo', {
    value: true,
    writable: false,
    enumerable: true
  });`;

  instagramUtilsContent = instagramUtilsContent.replace(createFileSection, updatedCreateFileSection);
  await fs.writeFile(instagramUtilsPath, instagramUtilsContent);
  console.log('✅ Updated instagram-url-utils.ts\n');

  // Fix 2: Update animated-ai-input.tsx to properly handle Instagram video files
  const animatedInputPath = path.join(projectRoot, 'components/ui/animated-ai-input.tsx');
  let animatedInputContent = await fs.readFile(animatedInputPath, 'utf8');

  // Find the handleInstagramDownload section where files are created
  const handleInstagramSection = `      if (onFileSelect) {
        onFileSelect(mockFile)
      } else if (onFilesSelect) {
        onFilesSelect([mockFile])
      }`;

  const updatedHandleInstagramSection = `      // Debug the mockFile before passing it
      console.log('[handleInstagramDownload] File before passing to onFileSelect:', {
        name: mockFile.name,
        type: mockFile.type,
        hasVideoThumbnail: !!(mockFile as any).videoThumbnail,
        thumbnailLength: (mockFile as any).videoThumbnail?.length || 0,
        isInstagramVideo: (mockFile as any)._isInstagramVideo
      });

      if (onFileSelect) {
        // Create a new file object that preserves all custom properties
        const fileWithThumbnail = new File([mockFile], mockFile.name, { type: mockFile.type });
        
        // Copy all custom properties
        Object.keys(mockFile).forEach(key => {
          if (key !== 'size' && key !== 'name' && key !== 'type') {
            (fileWithThumbnail as any)[key] = (mockFile as any)[key];
          }
        });
        
        // Explicitly copy important properties
        if ((mockFile as any).videoThumbnail) {
          (fileWithThumbnail as any).videoThumbnail = (mockFile as any).videoThumbnail;
        }
        if ((mockFile as any).geminiFile) {
          (fileWithThumbnail as any).geminiFile = (mockFile as any).geminiFile;
        }
        if ((mockFile as any).isPreUploaded) {
          (fileWithThumbnail as any).isPreUploaded = (mockFile as any).isPreUploaded;
        }
        if ((mockFile as any)._isInstagramVideo) {
          (fileWithThumbnail as any)._isInstagramVideo = (mockFile as any)._isInstagramVideo;
        }
        
        console.log('[handleInstagramDownload] Passing file with preserved properties:', {
          hasVideoThumbnail: !!(fileWithThumbnail as any).videoThumbnail,
          thumbnailLength: (fileWithThumbnail as any).videoThumbnail?.length || 0
        });
        
        onFileSelect(fileWithThumbnail)
      } else if (onFilesSelect) {
        // Similar handling for multiple files
        const fileWithThumbnail = new File([mockFile], mockFile.name, { type: mockFile.type });
        
        // Copy all custom properties
        Object.keys(mockFile).forEach(key => {
          if (key !== 'size' && key !== 'name' && key !== 'type') {
            (fileWithThumbnail as any)[key] = (mockFile as any)[key];
          }
        });
        
        // Explicitly copy important properties
        if ((mockFile as any).videoThumbnail) {
          (fileWithThumbnail as any).videoThumbnail = (mockFile as any).videoThumbnail;
        }
        if ((mockFile as any).geminiFile) {
          (fileWithThumbnail as any).geminiFile = (mockFile as any).geminiFile;
        }
        if ((mockFile as any).isPreUploaded) {
          (fileWithThumbnail as any).isPreUploaded = (mockFile as any).isPreUploaded;
        }
        if ((mockFile as any)._isInstagramVideo) {
          (fileWithThumbnail as any)._isInstagramVideo = (mockFile as any)._isInstagramVideo;
        }
        
        onFilesSelect([fileWithThumbnail])
      }`;

  animatedInputContent = animatedInputContent.replace(handleInstagramSection, updatedHandleInstagramSection);
  await fs.writeFile(animatedInputPath, animatedInputContent);
  console.log('✅ Updated animated-ai-input.tsx\n');

  // Fix 3: Update chat-interface.tsx to preserve thumbnails when processing files
  const chatInterfacePath = path.join(projectRoot, 'components/chat-interface.tsx');
  let chatInterfaceContent = await fs.readFile(chatInterfacePath, 'utf8');

  // Find the processFile function where Instagram videos are handled
  const processFilePreUploadedSection = `      // For pre-uploaded files, we might need to generate preview differently
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

  const updatedProcessFilePreUploadedSection = `      // For pre-uploaded files, we might need to generate preview differently
      // since the actual file content might be minimal
      if (file.type.startsWith("video/")) {
        // Check if the file has a pre-extracted thumbnail from YouTube/Instagram
        if ((file as any).videoThumbnail) {
          console.log(\`[processFile] Using pre-extracted thumbnail for: \${file.name}\`, {
            thumbnailLength: (file as any).videoThumbnail?.length || 0,
            isDataUrl: (file as any).videoThumbnail?.startsWith('data:'),
            thumbnailPreview: (file as any).videoThumbnail?.substring(0, 100),
            isInstagramVideo: (file as any)._isInstagramVideo
          })
          fileUpload.videoThumbnail = (file as any).videoThumbnail
          // Don't set preview for videos - it's for images
          // fileUpload.preview = (file as any).videoThumbnail
        } else {
          // For videos without thumbnails, we can't generate from dummy content
          console.log(\`[processFile] No thumbnail available for pre-uploaded video: \${file.name}\`)
          
          // If this is an Instagram video without thumbnail, flag it for debugging
          if ((file as any)._isInstagramVideo) {
            console.error('[processFile] Instagram video missing thumbnail!', {
              fileName: file.name,
              fileType: file.type,
              hasGeminiFile: !!(file as any).geminiFile
            });
          }
        }
      }`;

  chatInterfaceContent = chatInterfaceContent.replace(processFilePreUploadedSection, updatedProcessFilePreUploadedSection);

  // Also update handleFileSelect to preserve thumbnail
  const handleFileSelectSection = `        setSelectedFile({
          file: fileToStore,
          geminiFile: fileUpload.geminiFile,
          preview: fileUpload.preview,
          transcription: fileUpload.transcription,
          videoThumbnail: fileUpload.videoThumbnail,
          videoDuration: fileUpload.videoDuration
        })`;

  const updatedHandleFileSelectSection = `        // Ensure all properties are preserved, especially for Instagram videos
        const selectedFileData = {
          file: fileToStore,
          geminiFile: fileUpload.geminiFile,
          preview: fileUpload.preview,
          transcription: fileUpload.transcription,
          videoThumbnail: fileUpload.videoThumbnail || (file as any).videoThumbnail, // Fallback to original file property
          videoDuration: fileUpload.videoDuration
        };
        
        // Debug log for Instagram videos
        if ((file as any)._isInstagramVideo || file.name.toLowerCase().includes('instagram')) {
          console.log('[handleFileSelect] Setting Instagram video:', {
            fileName: file.name,
            hasVideoThumbnail: !!selectedFileData.videoThumbnail,
            thumbnailLength: selectedFileData.videoThumbnail?.length || 0,
            thumbnailSource: fileUpload.videoThumbnail ? 'fileUpload' : 'original file'
          });
        }
        
        setSelectedFile(selectedFileData)`;

  if (!chatInterfaceContent.includes('Ensure all properties are preserved')) {
    chatInterfaceContent = chatInterfaceContent.replace(handleFileSelectSection, updatedHandleFileSelectSection);
  }

  await fs.writeFile(chatInterfacePath, chatInterfaceContent);
  console.log('✅ Updated chat-interface.tsx\n');

  // Fix 4: Create a utility to extract video frames as fallback
  const videoFrameExtractorPath = path.join(projectRoot, 'lib/video-frame-extractor.ts');
  const videoFrameExtractorContent = `/**
 * Utility to extract frames from video files for thumbnail generation
 */

/**
 * Extract a frame from a video blob URL at a specific time
 */
export async function extractVideoFrame(
  videoBlobUrl: string,
  timeInSeconds: number = 0
): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('[extractVideoFrame] Failed to get canvas context');
      resolve(null);
      return;
    }

    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    
    const cleanup = () => {
      video.remove();
      canvas.remove();
    };

    video.addEventListener('loadedmetadata', () => {
      // Set the time to extract frame
      video.currentTime = Math.min(timeInSeconds, video.duration);
    });

    video.addEventListener('seeked', () => {
      try {
        // Set canvas size to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        cleanup();
        resolve(dataUrl);
      } catch (error) {
        console.error('[extractVideoFrame] Error extracting frame:', error);
        cleanup();
        resolve(null);
      }
    });

    video.addEventListener('error', () => {
      console.error('[extractVideoFrame] Video loading error');
      cleanup();
      resolve(null);
    });

    // Set a timeout
    setTimeout(() => {
      cleanup();
      resolve(null);
    }, 5000);

    video.src = videoBlobUrl;
    video.load();
  });
}

/**
 * Extract a frame from a video file
 */
export async function extractVideoFrameFromFile(
  file: File,
  timeInSeconds: number = 0
): Promise<string | null> {
  try {
    // Create object URL from file
    const blobUrl = URL.createObjectURL(file);
    
    // Extract frame
    const frame = await extractVideoFrame(blobUrl, timeInSeconds);
    
    // Clean up object URL
    URL.revokeObjectURL(blobUrl);
    
    return frame;
  } catch (error) {
    console.error('[extractVideoFrameFromFile] Error:', error);
    return null;
  }
}

/**
 * Try to extract thumbnail from Instagram video that failed to get one from API
 */
export async function extractInstagramVideoThumbnail(file: File): Promise<string | null> {
  // Only process video files
  if (!file.type.startsWith('video/')) {
    return null;
  }
  
  console.log('[extractInstagramVideoThumbnail] Attempting to extract thumbnail from:', file.name);
  
  // Try to extract frame at 1 second
  let thumbnail = await extractVideoFrameFromFile(file, 1.0);
  
  // If that fails, try at 0 seconds
  if (!thumbnail) {
    thumbnail = await extractVideoFrameFromFile(file, 0);
  }
  
  if (thumbnail) {
    console.log('[extractInstagramVideoThumbnail] Successfully extracted thumbnail');
  } else {
    console.error('[extractInstagramVideoThumbnail] Failed to extract thumbnail');
  }
  
  return thumbnail;
}
`;

  await fs.writeFile(videoFrameExtractorPath, videoFrameExtractorContent);
  console.log('✅ Created video-frame-extractor.ts\n');

  console.log('🎉 Comprehensive Instagram video thumbnail fixes applied!\n');
  console.log('The fix includes:');
  console.log('1. Enhanced property preservation through the file handling flow');
  console.log('2. Better debugging to track thumbnail data');
  console.log('3. Made videoThumbnail property writable and enumerable');
  console.log('4. Created video frame extractor as fallback\n');
  
  console.log('Next steps:');
  console.log('1. Restart your development server');
  console.log('2. Clear browser cache (important!)');
  console.log('3. Test with Instagram video URL');
  console.log('4. Check console for detailed debugging logs\n');
}

// Run the fix
fixInstagramVideoThumbnailComprehensive().catch(console.error);
