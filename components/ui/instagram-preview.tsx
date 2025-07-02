import React from 'react';
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
                  className={`h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all ${
                    downloadProgress === 0 ? 'w-0' :
                    downloadProgress <= 5 ? 'w-[5%]' :
                    downloadProgress <= 10 ? 'w-[10%]' :
                    downloadProgress <= 15 ? 'w-[15%]' :
                    downloadProgress <= 20 ? 'w-[20%]' :
                    downloadProgress <= 25 ? 'w-1/4' :
                    downloadProgress <= 30 ? 'w-[30%]' :
                    downloadProgress <= 35 ? 'w-[35%]' :
                    downloadProgress <= 40 ? 'w-[40%]' :
                    downloadProgress <= 45 ? 'w-[45%]' :
                    downloadProgress <= 50 ? 'w-1/2' :
                    downloadProgress <= 55 ? 'w-[55%]' :
                    downloadProgress <= 60 ? 'w-[60%]' :
                    downloadProgress <= 65 ? 'w-[65%]' :
                    downloadProgress <= 70 ? 'w-[70%]' :
                    downloadProgress <= 75 ? 'w-3/4' :
                    downloadProgress <= 80 ? 'w-[80%]' :
                    downloadProgress <= 85 ? 'w-[85%]' :
                    downloadProgress <= 90 ? 'w-[90%]' :
                    downloadProgress <= 95 ? 'w-[95%]' :
                    'w-full'
                  }`}
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
