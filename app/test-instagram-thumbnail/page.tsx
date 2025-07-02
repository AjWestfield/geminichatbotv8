'use client';

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
