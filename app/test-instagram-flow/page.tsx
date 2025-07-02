'use client';

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
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry, data);
    setLogs(prev => [...prev, data ? `${logEntry} ${JSON.stringify(data, null, 2)}` : logEntry]);
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
              {logs.join('\n')}
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
