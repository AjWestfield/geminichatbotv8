'use client';

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
