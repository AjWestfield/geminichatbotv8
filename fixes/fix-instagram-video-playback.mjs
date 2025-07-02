#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

async function fixInstagramVideoPlayback() {
  console.log('🎬 Fixing Instagram video playback in preview modal...\n');

  // Fix 1: Update chat-interface.tsx to ensure URL is set for pre-uploaded videos
  const chatInterfacePath = path.join(projectRoot, 'components/chat-interface.tsx');
  let chatInterfaceContent = await fs.readFile(chatInterfacePath, 'utf8');

  // Find where attachments are created from pending attachments
  const attachmentCreationSection = `              // Add the primary attachment
              const primaryAttachment = {
                name: pendingAttachment.name,
                contentType: pendingAttachment.contentType,
                url: pendingAttachment.url,
                transcription: pendingAttachment.transcription,
                videoThumbnail: pendingAttachment.videoThumbnail,
                videoDuration: pendingAttachment.videoDuration
              };`;

  const updatedAttachmentCreationSection = `              // Add the primary attachment
              const primaryAttachment = {
                name: pendingAttachment.name,
                contentType: pendingAttachment.contentType,
                url: pendingAttachment.url || pendingAttachment.geminiFileUri, // Use Gemini URI as fallback
                transcription: pendingAttachment.transcription,
                videoThumbnail: pendingAttachment.videoThumbnail,
                videoDuration: pendingAttachment.videoDuration,
                geminiFileUri: pendingAttachment.geminiFileUri // Preserve Gemini URI
              };`;

  if (!chatInterfaceContent.includes('Use Gemini URI as fallback')) {
    chatInterfaceContent = chatInterfaceContent.replace(attachmentCreationSection, updatedAttachmentCreationSection);
    console.log('✅ Updated attachment creation to include Gemini URI as URL fallback');
  }

  // Also update where pendingAttachment is set
  const pendingAttachmentSection = `        pendingAttachmentRef.current = {
          name: primaryFile.file.name,
          contentType: primaryFile.file.type,
          url: primaryFile.preview || '',
          transcription: primaryFile.transcription,
          videoThumbnail: primaryFile.videoThumbnail,
          videoDuration: primaryFile.videoDuration,`;

  const updatedPendingAttachmentSection = `        pendingAttachmentRef.current = {
          name: primaryFile.file.name,
          contentType: primaryFile.file.type,
          url: primaryFile.preview || '',
          geminiFileUri: primaryFile.geminiFile?.uri, // Store Gemini URI
          transcription: primaryFile.transcription,
          videoThumbnail: primaryFile.videoThumbnail,
          videoDuration: primaryFile.videoDuration,`;

  if (!chatInterfaceContent.includes('Store Gemini URI')) {
    chatInterfaceContent = chatInterfaceContent.replace(pendingAttachmentSection, updatedPendingAttachmentSection);
    console.log('✅ Updated pendingAttachment to store Gemini URI');
  }

  await fs.writeFile(chatInterfacePath, chatInterfaceContent);
  console.log('✅ Updated chat-interface.tsx\n');

  // Fix 2: Update the enhanced video modal to handle Gemini URIs
  const enhancedVideoModalPath = path.join(projectRoot, 'components/ui/enhanced-video-modal.tsx');
  
  try {
    let enhancedVideoModalContent = await fs.readFile(enhancedVideoModalPath, 'utf8');

    // Check if it's using the standard video element that expects a regular URL
    if (enhancedVideoModalContent.includes('video') && enhancedVideoModalContent.includes('source src=')) {
      console.log('⚠️  Enhanced video modal uses standard HTML video element');
      console.log('   Gemini URIs cannot be played directly in HTML video elements');
      console.log('   Need to implement a different approach for Instagram videos\n');
    }
  } catch (error) {
    console.log('⚠️  Could not find enhanced-video-modal.tsx');
  }

  // Fix 3: Create a component to handle Instagram video playback
  const instagramVideoPlayerPath = path.join(projectRoot, 'components/instagram-video-player.tsx');
  const instagramVideoPlayerContent = `'use client';

import { useState, useEffect } from 'react';
import { Video, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstagramVideoPlayerProps {
  file: {
    name: string;
    url?: string;
    geminiFileUri?: string;
    contentType: string;
    videoThumbnail?: string;
    videoDuration?: number;
  };
  className?: string;
}

export function InstagramVideoPlayer({ file, className }: InstagramVideoPlayerProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // For Instagram videos uploaded to Gemini, we need to handle them differently
  const isGeminiVideo = !file.url && file.geminiFileUri;

  if (isGeminiVideo) {
    return (
      <div className={cn("bg-black/20 rounded-lg p-8 text-center flex flex-col items-center justify-center", className)}>
        <Video className="w-16 h-16 text-gray-400 mb-4" />
        <p className="text-gray-400 text-base mb-2">Instagram Video Preview</p>
        <p className="text-sm text-gray-500 mb-4">
          This video has been uploaded to Gemini AI for analysis
        </p>
        {file.videoThumbnail && (
          <div className="mt-4">
            <img 
              src={file.videoThumbnail} 
              alt="Video thumbnail"
              className="rounded-lg max-w-full h-auto"
              style={{ maxHeight: '300px' }}
            />
          </div>
        )}
        <div className="mt-4 text-xs text-gray-500">
          <p>Video: {file.name}</p>
          {file.videoDuration && <p>Duration: {Math.floor(file.videoDuration / 60)}:{(file.videoDuration % 60).toString().padStart(2, '0')}</p>}
        </div>
      </div>
    );
  }

  // For regular videos with URLs
  if (file.url) {
    return (
      <video
        controls
        className={cn("w-full h-full", className)}
        preload="metadata"
        poster={file.videoThumbnail}
        onError={() => setError('Failed to load video')}
      >
        <source src={file.url} type={file.contentType} />
        Your browser does not support the video element.
      </video>
    );
  }

  // No video URL available
  return (
    <div className={cn("bg-black/20 rounded-lg p-8 text-center flex flex-col items-center justify-center", className)}>
      <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
      <p className="text-gray-400 text-base">Video not available</p>
      <p className="text-sm text-gray-500 mt-2">No video URL found</p>
    </div>
  );
}
`;

  await fs.writeFile(instagramVideoPlayerPath, instagramVideoPlayerContent);
  console.log('✅ Created InstagramVideoPlayer component\n');

  // Fix 4: Update the FilePreviewModal to handle videos without URLs
  const filePreviewModalPath = path.join(projectRoot, 'components/file-preview-modal.tsx');
  let filePreviewModalContent = await fs.readFile(filePreviewModalPath, 'utf8');

  // Update the video section to handle missing URLs better
  const videoCheckSection = `              {file.url ? (`;
  const updatedVideoCheckSection = `              {(file.url || (file as any).geminiFileUri) ? (`;

  filePreviewModalContent = filePreviewModalContent.replace(videoCheckSection, updatedVideoCheckSection);

  // Also update the video source to handle Gemini URIs
  const videoSourceSection = `                      <source src={file.url} type={file.contentType} />`;
  const updatedVideoSourceSection = `                      <source src={file.url || ''} type={file.contentType} />`;

  filePreviewModalContent = filePreviewModalContent.replace(videoSourceSection, updatedVideoSourceSection);

  // Add a message for Gemini-hosted videos
  const videoPreviewSection = `                <div className="bg-black/20 rounded-lg p-8 sm:p-12 text-center flex-1 flex flex-col items-center justify-center">
                  <Video className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mb-3 sm:mb-4" />
                  <p className="text-gray-400 text-sm sm:text-base">Video preview not available</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">The video file URL is missing</p>
                </div>`;

  const updatedVideoPreviewSection = `                <div className="bg-black/20 rounded-lg p-8 sm:p-12 text-center flex-1 flex flex-col items-center justify-center">
                  <Video className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mb-3 sm:mb-4" />
                  <p className="text-gray-400 text-sm sm:text-base">Instagram Video Preview</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    {(file as any).geminiFileUri ? 'This video is hosted on Gemini AI' : 'The video file URL is missing'}
                  </p>
                  {file.videoThumbnail && (
                    <div className="mt-4">
                      <img 
                        src={file.videoThumbnail} 
                        alt="Video thumbnail"
                        className="rounded-lg max-w-full h-auto"
                        style={{ maxHeight: '200px' }}
                      />
                    </div>
                  )}
                  {file.videoDuration && (
                    <p className="text-xs text-gray-500 mt-2">
                      Duration: {Math.floor(file.videoDuration / 60)}:{(file.videoDuration % 60).toString().padStart(2, '0')}
                    </p>
                  )}
                </div>`;

  filePreviewModalContent = filePreviewModalContent.replace(videoPreviewSection, updatedVideoPreviewSection);

  await fs.writeFile(filePreviewModalPath, filePreviewModalContent);
  console.log('✅ Updated FilePreviewModal to handle Instagram videos\n');

  console.log('🎉 Instagram video playback fixes applied!\n');
  console.log('What was fixed:');
  console.log('1. Attachments now include Gemini URI information');
  console.log('2. Created InstagramVideoPlayer component for special handling');
  console.log('3. Updated FilePreviewModal to show thumbnail and info for Gemini-hosted videos');
  console.log('4. Added better messaging for videos without direct URLs\n');
  
  console.log('Note: Instagram videos uploaded to Gemini cannot be played directly in the browser');
  console.log('because Gemini URIs are not standard HTTP URLs. The video has been successfully');
  console.log('uploaded for AI analysis, but playback is not available.\n');
  
  console.log('The modal now shows:');
  console.log('- Video thumbnail (if available)');
  console.log('- Video duration');
  console.log('- Clear messaging that the video is hosted on Gemini AI\n');
}

// Run the fix
fixInstagramVideoPlayback().catch(console.error);
