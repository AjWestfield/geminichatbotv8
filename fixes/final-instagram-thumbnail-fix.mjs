#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

async function finalInstagramThumbnailFix() {
  console.log('🎯 Final Instagram Video Thumbnail Fix - Complete Flow...\n');

  // Fix 1: Ensure the Instagram API always returns thumbnail data
  const instagramApiPath = path.join(projectRoot, 'app/api/instagram-download/route.ts');
  let instagramApiContent = await fs.readFile(instagramApiPath, 'utf8');

  // Add a fallback thumbnail for videos if download fails
  const noThumbnailSection = `      return NextResponse.json({
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

  const updatedNoThumbnailSection = `      // Create a fallback thumbnail for videos without one
      if (!thumbnailDataUrl && mimeType.startsWith('video/')) {
        console.log('[Instagram Download API] No thumbnail available, creating placeholder');
        // Create a simple colored placeholder
        const placeholderSvg = \`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
          <defs>
            <linearGradient id="instagram" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#833AB4;stop-opacity:1" />
              <stop offset="50%" style="stop-color:#FD1D1D;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#FCB045;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="400" height="400" fill="url(#instagram)"/>
          <text x="200" y="210" font-family="Arial" font-size="100" fill="white" text-anchor="middle">▶</text>
        </svg>\`;
        
        const svgBuffer = Buffer.from(placeholderSvg);
        thumbnailDataUrl = \`data:image/svg+xml;base64,\${svgBuffer.toString('base64')}\`;
        console.log('[Instagram Download API] Created placeholder thumbnail');
      }

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

  instagramApiContent = instagramApiContent.replace(noThumbnailSection, updatedNoThumbnailSection);
  await fs.writeFile(instagramApiPath, instagramApiContent);
  console.log('✅ Added fallback thumbnail generation to API\n');

  // Fix 2: Update createFileFromInstagramDownload to handle the file object properly
  const instagramUtilsPath = path.join(projectRoot, 'lib/instagram-url-utils.ts');
  let instagramUtilsContent = await fs.readFile(instagramUtilsPath, 'utf8');

  // Replace the entire createFileFromInstagramDownload function
  const oldCreateFunction = instagramUtilsContent.match(/export function createFileFromInstagramDownload[\s\S]*?^}/m)?.[0];
  
  if (oldCreateFunction) {
    const newCreateFunction = `export function createFileFromInstagramDownload(downloadResult: any, mediaTitle: string): File {
  console.log('[createFileFromInstagramDownload] Input:', {
    hasFile: !!downloadResult.file,
    hasThumbnail: !!downloadResult.thumbnail,
    thumbnailLength: downloadResult.thumbnail?.length || 0,
    fileUri: downloadResult.file?.uri,
    fileMimeType: downloadResult.file?.mimeType,
    fileSizeBytes: downloadResult.file?.sizeBytes,
    mediaTitle
  })

  // Create a minimal File-like object that's compatible with the existing system
  const fileName = \`\${mediaTitle.replace(/[^a-zA-Z0-9\\s-]/g, '').trim()}.mp4\`

  // Create a dummy blob with minimal content to satisfy file size requirements
  // The actual content is stored in Gemini and referenced via the geminiFile property
  const dummyContent = new Blob(['placeholder'], { type: downloadResult.file.mimeType || 'video/mp4' })

  // Create the base file
  const mockFile = new File([dummyContent], fileName, {
    type: downloadResult.file.mimeType || 'video/mp4'
  }) as File & {
    geminiFile?: any;
    isPreUploaded?: boolean;
    videoThumbnail?: string;
    _isInstagramVideo?: boolean;
  }

  // Add custom properties using Object.defineProperty for better compatibility
  Object.defineProperty(mockFile, 'geminiFile', {
    value: {
      uri: downloadResult.file.uri,
      mimeType: downloadResult.file.mimeType,
      name: downloadResult.file.name,
      sizeBytes: downloadResult.file.sizeBytes || 0,
      displayName: downloadResult.file.displayName
    },
    writable: true,
    enumerable: true,
    configurable: true
  })

  // Add a flag to indicate this is a pre-uploaded file
  Object.defineProperty(mockFile, 'isPreUploaded', {
    value: true,
    writable: false,
    enumerable: true,
    configurable: true
  })

  // Add video thumbnail if available - CRITICAL FIX
  if (downloadResult.thumbnail) {
    // Ensure the thumbnail is a valid data URL
    if (downloadResult.thumbnail.startsWith('data:image/')) {
      // Use regular property assignment for better compatibility
      mockFile.videoThumbnail = downloadResult.thumbnail;
      
      // Also use defineProperty as backup
      Object.defineProperty(mockFile, 'videoThumbnail', {
        value: downloadResult.thumbnail,
        writable: true,
        enumerable: true,
        configurable: true
      });
      
      console.log('[createFileFromInstagramDownload] Added videoThumbnail:', {
        length: downloadResult.thumbnail.length,
        preview: downloadResult.thumbnail.substring(0, 100) + '...',
        isDataUrl: downloadResult.thumbnail.startsWith('data:image/'),
        propertyExists: 'videoThumbnail' in mockFile,
        propertyValue: !!mockFile.videoThumbnail
      });
    } else {
      console.warn('[createFileFromInstagramDownload] Thumbnail is not a valid data URL:', downloadResult.thumbnail.substring(0, 100));
    }
  } else {
    console.log('[createFileFromInstagramDownload] No thumbnail available in downloadResult');
  }
  
  // Add a flag to help debug the flow
  mockFile._isInstagramVideo = true;

  console.log('[createFileFromInstagramDownload] Created file:', {
    name: mockFile.name,
    type: mockFile.type,
    size: mockFile.size,
    hasGeminiFile: !!mockFile.geminiFile,
    geminiUri: mockFile.geminiFile?.uri,
    hasVideoThumbnail: !!mockFile.videoThumbnail,
    videoThumbnailExists: 'videoThumbnail' in mockFile,
    isPreUploaded: mockFile.isPreUploaded,
    _isInstagramVideo: mockFile._isInstagramVideo
  })

  return mockFile
}`;

    instagramUtilsContent = instagramUtilsContent.replace(oldCreateFunction, newCreateFunction);
    await fs.writeFile(instagramUtilsPath, instagramUtilsContent);
    console.log('✅ Replaced createFileFromInstagramDownload with improved version\n');
  }

  // Fix 3: Update the chat interface to handle FileUpload type correctly
  const chatInterfacePath = path.join(projectRoot, 'components/chat-interface.tsx');
  let chatInterfaceContent = await fs.readFile(chatInterfacePath, 'utf8');

  // Update the FileUpload interface if needed
  const fileUploadInterface = `interface FileUpload {
  file: File
  geminiFile?: any
  preview?: string
  transcription?: any
  videoThumbnail?: string
  videoDuration?: number
}`;

  const updatedFileUploadInterface = `interface FileUpload {
  file: File & {
    videoThumbnail?: string;
    geminiFile?: any;
    isPreUploaded?: boolean;
    _isInstagramVideo?: boolean;
  }
  geminiFile?: any
  preview?: string
  transcription?: any
  videoThumbnail?: string
  videoDuration?: number
}`;

  if (chatInterfaceContent.includes('interface FileUpload {')) {
    chatInterfaceContent = chatInterfaceContent.replace(fileUploadInterface, updatedFileUploadInterface);
    console.log('✅ Updated FileUpload interface\n');
  }

  await fs.writeFile(chatInterfacePath, chatInterfaceContent);

  // Fix 4: Create a diagnostic page to test the entire flow
  const diagnosticPagePath = path.join(projectRoot, 'app/test-instagram-flow/page.tsx');
  const diagnosticPageDir = path.dirname(diagnosticPagePath);
  
  await fs.mkdir(diagnosticPageDir, { recursive: true });
  
  const diagnosticPageContent = `'use client';

import { useState } from 'react';
import { downloadInstagramMedia, createFileFromInstagramDownload, getDisplayTitleFromUrl } from '@/lib/instagram-url-utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TestInstagramFlow() {
  const [url, setUrl] = useState('https://www.instagram.com/reels/DKDng9oPWqG/');
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [file, setFile] = useState<any>(null);

  const addLog = (message: string, data?: any) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logEntry = \`[\${timestamp}] \${message}\`;
    console.log(logEntry, data);
    setLogs(prev => [...prev, data ? \`\${logEntry} \${JSON.stringify(data, null, 2)}\` : logEntry]);
  };

  const testFullFlow = async () => {
    setLogs([]);
    setResult(null);
    setFile(null);
    
    try {
      addLog('Starting Instagram download test');
      addLog('URL:', url);

      // Step 1: Download from Instagram
      addLog('Step 1: Calling downloadInstagramMedia...');
      const downloadResult = await downloadInstagramMedia(url, (progress) => {
        addLog('Progress update:', progress);
      });

      addLog('Download result:', {
        hasFile: !!downloadResult.file,
        hasThumbnail: !!downloadResult.thumbnail,
        thumbnailLength: downloadResult.thumbnail?.length || 0,
        mediaType: downloadResult.mediaType
      });

      setResult(downloadResult);

      // Step 2: Create file object
      addLog('Step 2: Creating file object...');
      const mediaTitle = getDisplayTitleFromUrl(url);
      const mockFile = createFileFromInstagramDownload(downloadResult, mediaTitle);

      addLog('Created file:', {
        name: mockFile.name,
        type: mockFile.type,
        hasVideoThumbnail: !!(mockFile as any).videoThumbnail,
        videoThumbnailInFile: 'videoThumbnail' in mockFile,
        thumbnailLength: (mockFile as any).videoThumbnail?.length || 0
      });

      setFile(mockFile);

      // Step 3: Test file properties
      addLog('Step 3: Testing file properties...');
      const fileAsAny = mockFile as any;
      
      addLog('Property checks:', {
        hasVideoThumbnail: !!fileAsAny.videoThumbnail,
        videoThumbnailType: typeof fileAsAny.videoThumbnail,
        isDataUrl: fileAsAny.videoThumbnail?.startsWith('data:image/'),
        hasGeminiFile: !!fileAsAny.geminiFile,
        isPreUploaded: fileAsAny.isPreUploaded,
        _isInstagramVideo: fileAsAny._isInstagramVideo
      });

    } catch (error) {
      addLog('ERROR:', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Instagram Video Thumbnail Flow Test</h1>

      <Card className="p-6">
        <div className="space-y-4">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Instagram URL"
          />
          <Button onClick={testFullFlow} className="w-full">
            Test Full Download Flow
          </Button>
        </div>
      </Card>

      {logs.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Debug Logs</h2>
          <div className="bg-black/20 rounded p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap font-mono">
              {logs.join('\\n')}
            </pre>
          </div>
        </Card>
      )}

      {result && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">API Result</h2>
          {result.thumbnail && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Thumbnail from API:</h3>
              <img 
                src={result.thumbnail} 
                alt="API thumbnail"
                className="w-32 h-32 object-cover rounded"
                onError={() => addLog('Thumbnail failed to load from API')}
                onLoad={() => addLog('Thumbnail loaded successfully from API')}
              />
            </div>
          )}
          <pre className="text-xs bg-black/20 p-4 rounded overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}

      {file && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">File Object</h2>
          {(file as any).videoThumbnail && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Thumbnail from File:</h3>
              <img 
                src={(file as any).videoThumbnail} 
                alt="File thumbnail"
                className="w-32 h-32 object-cover rounded"
                onError={() => addLog('Thumbnail failed to load from file')}
                onLoad={() => addLog('Thumbnail loaded successfully from file')}
              />
            </div>
          )}
          <pre className="text-xs bg-black/20 p-4 rounded overflow-x-auto">
            {JSON.stringify({
              name: file.name,
              type: file.type,
              size: file.size,
              hasVideoThumbnail: !!(file as any).videoThumbnail,
              videoThumbnailLength: (file as any).videoThumbnail?.length || 0,
              hasGeminiFile: !!(file as any).geminiFile,
              isPreUploaded: (file as any).isPreUploaded,
              _isInstagramVideo: (file as any)._isInstagramVideo
            }, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
`;

  await fs.writeFile(diagnosticPagePath, diagnosticPageContent);
  console.log('✅ Created diagnostic page at /test-instagram-flow\n');

  console.log('🎉 Final Instagram video thumbnail fixes applied!\n');
  console.log('This fix includes:');
  console.log('1. Fallback SVG thumbnail for videos without thumbnails');
  console.log('2. Improved file object creation with proper property handling');
  console.log('3. Updated FileUpload interface for better type support');
  console.log('4. Diagnostic page to test the entire flow\n');
  
  console.log('To test:');
  console.log('1. Restart your development server');
  console.log('2. Navigate to http://localhost:3001/test-instagram-flow');
  console.log('3. Click "Test Full Download Flow"');
  console.log('4. Check the debug logs and verify thumbnail is present');
  console.log('5. Try the same URL in the main chat interface\n');
  
  console.log('The diagnostic page will show:');
  console.log('- Complete debug logs of the download process');
  console.log('- API response with thumbnail data');
  console.log('- File object properties');
  console.log('- Visual display of thumbnails\n');
}

// Run the fix
finalInstagramThumbnailFix().catch(console.error);
