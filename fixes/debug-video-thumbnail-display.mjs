#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

async function debugAndFixVideoThumbnailDisplay() {
  console.log('🔍 Debugging and fixing video thumbnail display in UI...\n');

  // Fix 1: Add comprehensive debugging to animated-ai-input.tsx file display
  const animatedInputPath = path.join(projectRoot, 'components/ui/animated-ai-input.tsx');
  let animatedInputContent = await fs.readFile(animatedInputPath, 'utf8');

  // Find the video thumbnail display section
  const videoThumbnailSection = `                          ) : file.file.type.startsWith("video/") ? (
                            <>
                              {file.videoThumbnail ? (
                                <div className="relative w-full h-full">
                                  <img
                                    src={file.videoThumbnail}
                                    alt="Video thumbnail"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                    <Video className="w-4 h-4 text-white" />
                                  </div>
                                </div>
                              ) : (
                                <Video className="w-5 h-5 text-[#B0B0B0]" />
                              )}
                            </>`;

  const updatedVideoThumbnailSection = `                          ) : file.file.type.startsWith("video/") ? (
                            <>
                              {(() => {
                                // Debug logging for video thumbnails
                                const hasDirectThumbnail = !!file.videoThumbnail;
                                const hasFileThumbnail = !!(file.file as any).videoThumbnail;
                                const thumbnailToUse = file.videoThumbnail || (file.file as any).videoThumbnail;
                                
                                if (file.file.name.toLowerCase().includes('instagram')) {
                                  console.log('[Video Thumbnail Debug]', {
                                    fileName: file.file.name,
                                    hasDirectThumbnail,
                                    hasFileThumbnail,
                                    directThumbnailLength: file.videoThumbnail?.length || 0,
                                    fileThumbnailLength: (file.file as any).videoThumbnail?.length || 0,
                                    isInstagramVideo: (file.file as any)._isInstagramVideo,
                                    fileObject: file
                                  });
                                }
                                
                                return thumbnailToUse ? (
                                  <div className="relative w-full h-full">
                                    <img
                                      src={thumbnailToUse}
                                      alt="Video thumbnail"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        console.error('[Video Thumbnail] Failed to load:', {
                                          fileName: file.file.name,
                                          thumbnailLength: thumbnailToUse.length,
                                          thumbnailPreview: thumbnailToUse.substring(0, 100)
                                        });
                                        // Hide broken image and show video icon
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                      onLoad={() => {
                                        console.log('[Video Thumbnail] Successfully loaded for:', file.file.name);
                                      }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                      <Video className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <Video className="w-5 h-5 text-[#B0B0B0]" />
                                );
                              })()}
                            </>`;

  animatedInputContent = animatedInputContent.replace(videoThumbnailSection, updatedVideoThumbnailSection);

  // Also update the selectedFile video display section
  const selectedFileVideoSection = `                          ) : selectedFile.file.type.startsWith("video/") ? (
                            <>
                              {selectedFile.videoThumbnail ? (
                                <div className="relative w-full h-full">
                                  <img
                                    src={selectedFile.videoThumbnail}
                                    alt="Video thumbnail"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                    <Video className="w-4 h-4 text-white" />
                                  </div>
                                </div>
                              ) : (
                                <Video className="w-5 h-5 text-[#B0B0B0]" />
                              )}
                            </>`;

  const updatedSelectedFileVideoSection = `                          ) : selectedFile.file.type.startsWith("video/") ? (
                            <>
                              {(() => {
                                // Check both locations for thumbnail
                                const thumbnailToUse = selectedFile.videoThumbnail || (selectedFile.file as any).videoThumbnail;
                                
                                if (selectedFile.file.name.toLowerCase().includes('instagram')) {
                                  console.log('[Selected Video Thumbnail Debug]', {
                                    fileName: selectedFile.file.name,
                                    hasSelectedFileThumbnail: !!selectedFile.videoThumbnail,
                                    hasFileThumbnail: !!(selectedFile.file as any).videoThumbnail,
                                    thumbnailLength: thumbnailToUse?.length || 0
                                  });
                                }
                                
                                return thumbnailToUse ? (
                                  <div className="relative w-full h-full">
                                    <img
                                      src={thumbnailToUse}
                                      alt="Video thumbnail"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        console.error('[Selected Video Thumbnail] Failed to load');
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                      <Video className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <Video className="w-5 h-5 text-[#B0B0B0]" />
                                );
                              })()}
                            </>`;

  animatedInputContent = animatedInputContent.replace(selectedFileVideoSection, updatedSelectedFileVideoSection);
  
  await fs.writeFile(animatedInputPath, animatedInputContent);
  console.log('✅ Enhanced video thumbnail display with debugging\n');

  // Fix 2: Update the Instagram download flow to ensure thumbnail is in the right place
  const instagramDownloadApiPath = path.join(projectRoot, 'app/api/instagram-download/route.ts');
  let instagramApiContent = await fs.readFile(instagramDownloadApiPath, 'utf8');

  // Enhance the thumbnail download logging
  const thumbnailDownloadSection = `                console.log(\`[Instagram Download API] Downloading thumbnail\`)
                const thumbnailResponse = await fetch(mediaInfo.thumbnailUrl, {
                  headers: {
                    'User-Agent': USER_AGENT,
                    'Referer': 'https://www.instagram.com/'
                  }
                })`;

  const updatedThumbnailDownloadSection = `                console.log(\`[Instagram Download API] Downloading thumbnail from:\`, mediaInfo.thumbnailUrl)
                const thumbnailResponse = await fetch(mediaInfo.thumbnailUrl, {
                  headers: {
                    'User-Agent': USER_AGENT,
                    'Referer': 'https://www.instagram.com/',
                    'Accept': 'image/*',
                    'Accept-Encoding': 'gzip, deflate, br'
                  }
                })`;

  instagramApiContent = instagramApiContent.replace(thumbnailDownloadSection, updatedThumbnailDownloadSection);

  // Enhance thumbnail data URL creation
  const thumbnailDataUrlSection = `              const thumbnailBuffer = await thumbnailResponse.arrayBuffer()
              thumbnailDataUrl = \`data:image/jpeg;base64,\${Buffer.from(thumbnailBuffer).toString('base64')}\`
              console.log(\`[Instagram Download API] Thumbnail downloaded successfully\`)`;

  const updatedThumbnailDataUrlSection = `              const thumbnailBuffer = await thumbnailResponse.arrayBuffer()
              const base64Data = Buffer.from(thumbnailBuffer).toString('base64')
              thumbnailDataUrl = \`data:image/jpeg;base64,\${base64Data}\`
              console.log(\`[Instagram Download API] Thumbnail downloaded successfully\`, {
                bufferSize: thumbnailBuffer.byteLength,
                base64Length: base64Data.length,
                dataUrlLength: thumbnailDataUrl.length,
                dataUrlPreview: thumbnailDataUrl.substring(0, 100)
              })
              
              // Validate the data URL
              if (!thumbnailDataUrl.startsWith('data:image/') || base64Data.length < 100) {
                console.error('[Instagram Download API] Invalid thumbnail data:', {
                  isValidDataUrl: thumbnailDataUrl.startsWith('data:image/'),
                  base64Length: base64Data.length
                });
                thumbnailDataUrl = null;
              }`;

  instagramApiContent = instagramApiContent.replace(thumbnailDataUrlSection, updatedThumbnailDataUrlSection);
  
  await fs.writeFile(instagramDownloadApiPath, instagramApiContent);
  console.log('✅ Enhanced Instagram API thumbnail handling\n');

  // Fix 3: Create a test component to verify thumbnail display
  const testThumbnailPath = path.join(projectRoot, 'components/test-video-thumbnail.tsx');
  const testThumbnailContent = `'use client';

import { useState } from 'react';
import { Video } from 'lucide-react';

export function TestVideoThumbnail() {
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [showThumbnail, setShowThumbnail] = useState(false);

  const testThumbnails = [
    {
      name: 'Test Data URL',
      url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCABAAEADASIAAhEBAxEB/8QAGwABAAMBAQEBAAAAAAAAAAAAAAMEBQYBAgf/xAA0EAACAQMDAgQDBgYDAAAAAAABAgMABBEFEiExQQYTUWEicYEUIzKRobEHFUJSwfAzYuH/xAAZAQACAwEAAAAAAAAAAAAAAAACAwABBAX/xAAjEQACAgICAgIDAQAAAAAAAAAAAQIRAyESMQRBE1EiYXGR/9oADAMBAAIRAxEAPwD9TooooQKKKKECiiihAooooQKKKKECivCwHUgfWvN6f3L+dCHtFFFCBRRRQgUUUUIFFFFCBXhIHU4r2qOq3629k7BgrNhAT79ahtK2Dt6JJr+1hJEkyAjqAcn8qwtQ8U2qkpZxtK3Tc3Cj+9ZDzyyOXlkaRj1ZjkmjCsPPfSNuPxn3IrT+JdQcnEqRD0RBx9Tmqp1vVS273Ug+W0f7VTNIz5pezfDx4vov/wAx1PcGN7cEHow3KfoasQeKr2PCzJDMPUnafzH+KyTSqR5prsV8OL6R1tn4pspiFlLwN/2GR+YrWjljmXdE6uvqpyK/PzUtnezWcwlt3KN39x8jT8flP/oxZfEXcT9AorP0jVItStt6YWVfxpnp7j2rQrammrRzWmnTCiiiogUUUUIeEA9ayNdgEtqynqpDj5g1r1FcRCWJ0PQihkrVByado4LFOK8qS6Ty7iVMY2sRUdciStna7R7S8aWlQJ7XldwT8Dq3sRW2mWGSMmudNaujXGGKbzYlGcAfEOorTgm7aZk8jHSUkXjnNer1r48wHnI4qJ5sDrW+zla9GyQe9FZCXJCgFjmiq5Iq2f/Z'
    },
    {
      name: 'Instagram Reel Example',
      url: '' // Will be filled with actual Instagram thumbnail
    }
  ];

  const handleTestInstagramThumbnail = async () => {
    try {
      const response = await fetch('/api/instagram-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://www.instagram.com/reels/DKDng9oPWqG/' })
      });
      
      const data = await response.json();
      if (data.thumbnail) {
        setThumbnailUrl(data.thumbnail);
        setShowThumbnail(true);
      }
    } catch (error) {
      console.error('Test failed:', error);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Video Thumbnail Test</h2>
      
      <div className="space-y-2">
        <button
          onClick={() => {
            setThumbnailUrl(testThumbnails[0].url);
            setShowThumbnail(true);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Test with sample data URL
        </button>
        
        <button
          onClick={handleTestInstagramThumbnail}
          className="px-4 py-2 bg-purple-500 text-white rounded"
        >
          Test with Instagram API
        </button>
      </div>

      {showThumbnail && thumbnailUrl && (
        <div className="space-y-2">
          <h3 className="font-semibold">Thumbnail Display Test:</h3>
          
          <div className="bg-gray-800 p-4 rounded">
            <div className="w-32 h-32 relative">
              <img
                src={thumbnailUrl}
                alt="Test thumbnail"
                className="w-full h-full object-cover rounded"
                onError={(e) => {
                  console.error('Thumbnail failed to load');
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
                onLoad={() => {
                  console.log('Thumbnail loaded successfully');
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Video className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          
          <div className="text-xs text-gray-400">
            <p>Data URL Length: {thumbnailUrl.length}</p>
            <p>Starts with: {thumbnailUrl.substring(0, 50)}...</p>
          </div>
        </div>
      )}
    </div>
  );
}
`;

  await fs.writeFile(testThumbnailPath, testThumbnailContent);
  console.log('✅ Created test component for video thumbnails\n');

  console.log('🎉 Video thumbnail display debugging fixes applied!\n');
  console.log('Debug steps:');
  console.log('1. Clear browser cache and restart dev server');
  console.log('2. Open browser console (F12)');
  console.log('3. Paste an Instagram video URL');
  console.log('4. Look for these debug logs:');
  console.log('   - [Instagram Download] Creating file with result');
  console.log('   - [Video Thumbnail Debug]');
  console.log('   - [Selected Video Thumbnail Debug]');
  console.log('5. Check if thumbnail data is present in the logs\n');
  
  console.log('If thumbnail data exists but image doesn\'t show:');
  console.log('- Check for image loading errors in console');
  console.log('- Verify data URL format is correct');
  console.log('- Test with the TestVideoThumbnail component\n');
}

// Run the fix
debugAndFixVideoThumbnailDisplay().catch(console.error);
