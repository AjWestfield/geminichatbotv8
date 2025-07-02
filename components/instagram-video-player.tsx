'use client';

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
