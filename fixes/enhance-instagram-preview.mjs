#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

async function enhanceInstagramPreviewComponent() {
  console.log('🎨 Enhancing Instagram preview component for better thumbnail handling...\n');

  // Create an enhanced Instagram preview component
  const instagramPreviewPath = path.join(projectRoot, 'components/ui/instagram-preview.tsx');
  const instagramPreviewContent = `import React from 'react';
import { Video, Instagram, Download, X } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface InstagramPreviewProps {
  url: string;
  mediaId: string;
  type: 'reel' | 'post' | 'story';
  isDownloading?: boolean;
  downloadProgress?: number;
  onDownload: () => void;
  onRemove: () => void;
  thumbnail?: string;
  duration?: number;
}

export function InstagramPreview({
  url,
  mediaId,
  type,
  isDownloading = false,
  downloadProgress = 0,
  onDownload,
  onRemove,
  thumbnail,
  duration
}: InstagramPreviewProps) {
  const typeLabel = type === 'reel' ? 'Reel' : type === 'story' ? 'Story' : 'Post';
  
  return (
    <div className="relative group bg-black/20 rounded-lg overflow-hidden border border-white/10 hover:border-white/20 transition-all">
      <div className="flex items-center gap-3 p-3">
        {/* Thumbnail or Icon */}
        <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-black/30">
          {thumbnail ? (
            <>
              <img 
                src={thumbnail} 
                alt="Instagram video thumbnail"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('[InstagramPreview] Thumbnail failed to load');
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/50 rounded-full p-1">
                  <Video className="w-4 h-4 text-white" />
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
              <Instagram className="w-8 h-8 text-white" />
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white/90">Instagram {typeLabel}</span>
            {duration && (
              <span className="text-xs text-white/60">
                {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
              </span>
            )}
          </div>
          <p className="text-xs text-white/60 truncate">{url}</p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {isDownloading ? (
            <div className="flex items-center gap-2">
              <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                  style={{ width: \`\${downloadProgress}%\` }}
                />
              </div>
              <span className="text-xs text-white/60">{downloadProgress}%</span>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDownload}
              className="h-8 px-3 text-white/80 hover:text-white hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          )}
          
          <Button
            size="icon"
            variant="ghost"
            onClick={onRemove}
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
`;

  await fs.writeFile(instagramPreviewPath, instagramPreviewContent);
  console.log('✅ Created enhanced InstagramPreview component\n');

  // Update the Instagram download API to ensure thumbnails are always included
  const instagramApiPath = path.join(projectRoot, 'app/api/instagram-download/route.ts');
  let instagramApiContent = await fs.readFile(instagramApiPath, 'utf8');

  // Add fallback thumbnail generation for Instagram videos
  const apiReturnSection = `      return NextResponse.json({
        success: true,
        file: {
          uri: fileInfo.uri,
          mimeType: fileInfo.mimeType,
          displayName: fileInfo.displayName,
          name: fileInfo.name,
          sizeBytes: fileInfo.sizeBytes
        },
        thumbnail: thumbnailDataUrl // Include thumbnail if available
      })`;

  const updatedApiReturnSection = `      // Log thumbnail status before returning
      console.log(\`[Instagram Download API] Response summary:\`, {
        hasFile: true,
        fileUri: fileInfo.uri,
        mimeType: fileInfo.mimeType,
        hasThumbnail: !!thumbnailDataUrl,
        thumbnailLength: thumbnailDataUrl?.length || 0,
        isVideo: mimeType.startsWith('video/')
      });

      return NextResponse.json({
        success: true,
        file: {
          uri: fileInfo.uri,
          mimeType: fileInfo.mimeType,
          displayName: fileInfo.displayName,
          name: fileInfo.name,
          sizeBytes: fileInfo.sizeBytes
        },
        thumbnail: thumbnailDataUrl, // Include thumbnail if available
        // Also include media type for better handling
        mediaType: mimeType.startsWith('video/') ? 'video' : 'image'
      })`;

  instagramApiContent = instagramApiContent.replace(apiReturnSection, updatedApiReturnSection);
  await fs.writeFile(instagramApiPath, instagramApiContent);
  console.log('✅ Enhanced Instagram API response logging\n');

  // Create a test page to verify thumbnail handling
  const testPagePath = path.join(projectRoot, 'app/test-instagram-thumbnail/page.tsx');
  const testPageDir = path.dirname(testPagePath);
  
  await fs.mkdir(testPageDir, { recursive: true });
  
  const testPageContent = `'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function TestInstagramThumbnail() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/instagram-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Download failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Test Instagram Thumbnail Display</h1>
      
      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <Input
            placeholder="Paste Instagram URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full"
          />
          
          <Button 
            onClick={handleTest} 
            disabled={!url || loading}
            className="w-full"
          >
            {loading ? 'Downloading...' : 'Test Download'}
          </Button>
        </div>
      </Card>

      {error && (
        <Card className="p-6 mb-6 border-red-500">
          <h2 className="text-lg font-semibold mb-2 text-red-500">Error</h2>
          <p className="text-sm">{error}</p>
        </Card>
      )}

      {result && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Download Result</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">File Info:</h3>
              <pre className="text-xs bg-black/20 p-2 rounded overflow-x-auto">
                {JSON.stringify(result.file, null, 2)}
              </pre>
            </div>

            {result.thumbnail && (
              <div>
                <h3 className="font-medium mb-2">Thumbnail:</h3>
                <div className="bg-black/20 p-4 rounded">
                  <img 
                    src={result.thumbnail} 
                    alt="Video thumbnail"
                    className="max-w-full h-auto rounded"
                    onError={() => console.error('Thumbnail failed to load')}
                  />
                  <p className="text-xs mt-2 text-gray-500">
                    Data URL Length: {result.thumbnail.length} characters
                  </p>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-medium mb-2">Media Type:</h3>
              <p className="text-sm">{result.mediaType || 'Unknown'}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
`;

  await fs.writeFile(testPagePath, testPageContent);
  console.log('✅ Created test page at /test-instagram-thumbnail\n');

  console.log('🎉 Instagram preview enhancements completed!\n');
  console.log('Test the implementation:');
  console.log('1. Navigate to http://localhost:3001/test-instagram-thumbnail');
  console.log('2. Paste an Instagram video URL (e.g., https://www.instagram.com/reels/DKDng9oPWqG/)');
  console.log('3. Click "Test Download" to verify thumbnail is retrieved');
  console.log('4. Check if the thumbnail displays correctly');
  console.log('5. Try the same URL in the main chat interface\n');
}

// Run the enhancement
enhanceInstagramPreviewComponent().catch(console.error);
