"use client"

import { GeneratedVideo } from "@/lib/video-generation-types"
import { Play, Download, Loader2, X, Video as VideoIcon, AlertCircle, Clock, CheckCircle, RotateCw } from "lucide-react"
import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { VideoPlayerModal } from "./video-player-modal"
import { VideoLoadingCard } from "./video-loading-card"
import { isValidVideoUrl, getInvalidVideoMessage } from "@/lib/video-utils"
import { isReplicateUrlExpired } from "@/lib/video-validation"
import { VideoThumbnailGenerator } from "@/lib/video-thumbnail-generator"
import { useThumbnailCache } from "@/hooks/use-thumbnail-cache"

interface VideoGalleryProps {
  videos: GeneratedVideo[]
  onVideoClick?: (video: GeneratedVideo) => void
  onVideoDelete?: (videoId: string) => void
  onCancelVideo?: (videoId: string) => void
  onAnalyze?: (video: GeneratedVideo) => void
  onTranscribe?: (video: GeneratedVideo) => void
  className?: string
}

export function VideoGallery({ videos, onVideoClick, onVideoDelete, onCancelVideo, onAnalyze, onTranscribe, className }: VideoGalleryProps) {
  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<GeneratedVideo | null>(null)
  const [loadingVideos, setLoadingVideos] = useState<Set<string>>(new Set())
  const [videoThumbnails, setVideoThumbnails] = useState<Record<string, string>>({})
  const [thumbnailGenerating, setThumbnailGenerating] = useState<Set<string>>(new Set())
  const loadingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const thumbnailGenerator = useRef<VideoThumbnailGenerator | null>(null)
  const { getCachedThumbnail, setCachedThumbnail, removeCachedThumbnail } = useThumbnailCache()

  // Initialize thumbnail generator
  useEffect(() => {
    thumbnailGenerator.current = VideoThumbnailGenerator.getInstance()
  }, [])

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      loadingTimeouts.current.forEach(timeout => clearTimeout(timeout))
    }
  }, [])

  // Enhanced thumbnail generation function
  const generateThumbnail = useCallback(async (video: HTMLVideoElement, videoId: string) => {
    if (!thumbnailGenerator.current || thumbnailGenerating.has(videoId)) {
      return
    }

    try {
      console.log(`[VideoGallery] Starting enhanced thumbnail generation for video ${videoId}`)
      setThumbnailGenerating(prev => new Set(prev).add(videoId))
      
      // Try to generate thumbnail with multiple strategies
      const thumbnail = await thumbnailGenerator.current.generateFromVideo(video, {
        quality: 0.8,
        maxWidth: 1280,
        maxHeight: 720,
        format: 'jpeg'
      })
      
      if (thumbnail) {
        console.log(`[VideoGallery] Thumbnail generated successfully for video ${videoId}`)
        
        // Store in state
        setVideoThumbnails(prev => ({
          ...prev,
          [videoId]: thumbnail
        }))
        
        // Cache for future use
        setCachedThumbnail(videoId, thumbnail)
      } else {
        console.warn(`[VideoGallery] Failed to generate thumbnail for video ${videoId}`)
      }
    } catch (error) {
      console.error(`[VideoGallery] Error generating thumbnail for video ${videoId}:`, error)
    } finally {
      setThumbnailGenerating(prev => {
        const next = new Set(prev)
        next.delete(videoId)
        return next
      })
    }
  }, [setCachedThumbnail])

  // Generate thumbnail from URL (for videos not yet loaded)
  const generateThumbnailFromUrl = useCallback(async (url: string, videoId: string) => {
    if (!thumbnailGenerator.current || thumbnailGenerating.has(videoId) || videoThumbnails[videoId]) {
      return
    }

    try {
      console.log(`[VideoGallery] Generating thumbnail from URL for video ${videoId}`)
      setThumbnailGenerating(prev => new Set(prev).add(videoId))
      
      const thumbnail = await thumbnailGenerator.current.generateFromUrl(url, {
        quality: 0.8,
        maxWidth: 1280,
        maxHeight: 720,
        timePercent: 0.1
      })
      
      if (thumbnail) {
        console.log(`[VideoGallery] Thumbnail from URL generated successfully for video ${videoId}`)
        
        setVideoThumbnails(prev => ({
          ...prev,
          [videoId]: thumbnail
        }))
        
        setCachedThumbnail(videoId, thumbnail)
      }
    } catch (error) {
      console.error(`[VideoGallery] Error generating thumbnail from URL for video ${videoId}:`, error)
    } finally {
      setThumbnailGenerating(prev => {
        const next = new Set(prev)
        next.delete(videoId)
        return next
      })
    }
  }, [setCachedThumbnail, videoThumbnails])

  // Load cached thumbnails on mount
  useEffect(() => {
    videos.forEach(video => {
      if (video.id && !videoThumbnails[video.id]) {
        const cached = getCachedThumbnail(video.id)
        if (cached) {
          setVideoThumbnails(prev => ({
            ...prev,
            [video.id]: cached
          }))
        }
      }
    })
  }, [videos, getCachedThumbnail, videoThumbnails])

  // Auto-generate thumbnails for videos without them
  useEffect(() => {
    videos.forEach(video => {
      if (video.status === 'completed' && 
          video.id && 
          !videoThumbnails[video.id] && 
          !video.thumbnailUrl &&
          isValidVideoUrl(video.url) &&
          !isReplicateUrlExpired(video.url, video.createdAt)) {
        // Generate thumbnail from URL in background
        generateThumbnailFromUrl(video.url, video.id)
      }
    })
  }, [videos, videoThumbnails, generateThumbnailFromUrl])

  // Load existing thumbnailUrl from video objects
  useEffect(() => {
    videos.forEach(video => {
      if (video.id && video.thumbnailUrl && !videoThumbnails[video.id]) {
        setVideoThumbnails(prev => ({
          ...prev,
          [video.id]: video.thumbnailUrl!
        }))
        // Also cache it
        setCachedThumbnail(video.id, video.thumbnailUrl)
      }
    })
  }, [videos, videoThumbnails, setCachedThumbnail])

  // Organize videos by status
  const organizedVideos = useMemo(() => {
    // Filter out invalid videos first
    const validVideos = videos.filter(video => {
      if (!video) {
        console.warn('[VideoGallery] Filtering out null/undefined video')
        return false
      }
      if (!video.id) {
        console.warn('[VideoGallery] Filtering out video without ID:', video)
        return false
      }
      return true
    })

    // Then deduplicate videos to prevent key errors
    const uniqueVideos = Array.from(new Map(validVideos.map(v => [v.id, v])).values())

    const generating = uniqueVideos.filter(v => v.status === 'generating')
    const completed = uniqueVideos.filter(v => v.status === 'completed' || v.status === 'failed')

    // Sort with most recent first for both groups
    generating.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    completed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return [...generating, ...completed]
  }, [videos])

  const renderVideoCard = (video: GeneratedVideo) => {
    if (!video.id) {
      console.error('[VideoGallery] Attempted to render video without ID:', video)
      return null
    }

    if (!video.prompt) {
      console.warn('[VideoGallery] Video missing prompt:', video.id)
    }

    // Don't render videos with invalid or expired URLs in completed state
    if (video.status === 'completed') {
      if (!isValidVideoUrl(video.url)) {
        console.warn('[VideoGallery] Skipping video with invalid URL:', video.id, video.url)
        return null
      }
      
      // Check if Replicate URL is expired
      if (isReplicateUrlExpired(video.url, video.createdAt)) {
        console.warn('[VideoGallery] Video has expired Replicate URL:', video.id)
        // Show expired state instead of skipping entirely
        return (
          <div className="relative group cursor-pointer">
            <div className="aspect-video bg-gray-900 rounded-lg flex flex-col items-center justify-center border border-gray-700 relative group">
              <Clock className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-400 font-medium">Video Expired</p>
              <p className="text-xs text-gray-500 mt-1 px-4 text-center">
                Replicate URLs expire after 24 hours
              </p>
              
              {/* Delete button for expired videos */}
              {onVideoDelete && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 right-2 h-6 w-6 bg-black/60 hover:bg-red-600/80 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    onVideoDelete(video.id)
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )
      }
    }

    return (
      <div
        className="relative group cursor-pointer"
        onMouseEnter={() => {
          // Only try to load video if URL is not expired
          if (!isReplicateUrlExpired(video.url, video.createdAt)) {
            setHoveredVideo(video.id)
            // Start loading the video when hover begins
            const videoEl = document.querySelector(`video[data-video-id="${video.id}"]`) as HTMLVideoElement
            if (videoEl && videoEl.paused) {
              videoEl.load()
            }
          }
        }}
        onMouseLeave={() => setHoveredVideo(null)}
      >
        {video.status === 'generating' ? (
          <VideoLoadingCard
            video={video}
            onCancel={onCancelVideo}
            showCancel={!!onCancelVideo}
          />
        ) : video.status === 'failed' ? (
          <div className="aspect-video bg-red-900/20 rounded-lg flex flex-col items-center justify-center border border-red-800/50 relative group">
            <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
            <p className="text-sm text-red-400 font-medium">Generation failed</p>
            {video.error && (
              <p className="text-xs text-red-300 mt-1 px-4 text-center">{video.error}</p>
            )}

            {/* Delete button for failed videos */}
            {onVideoDelete && (
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2 h-6 w-6 bg-black/60 hover:bg-red-600/80 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  onVideoDelete(video.id)
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ) : (
          <div
            className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden"
            onClick={() => {
              if (onVideoClick) {
                onVideoClick(video)
              } else {
                setSelectedVideo(video)
              }
            }}
          >
            {isValidVideoUrl(video.url) ? (
              <>
                {/* Always show thumbnail as background */}
                {(videoThumbnails[video.id] || video.thumbnailUrl) && (
                  <img
                    src={videoThumbnails[video.id] || video.thumbnailUrl}
                    alt={video.prompt}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                
                {/* Show placeholder if no thumbnail yet */}
                {!videoThumbnails[video.id] && !video.thumbnailUrl && (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    {thumbnailGenerating.has(video.id) ? (
                      <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                    ) : (
                      <VideoIcon className="h-12 w-12 text-gray-600" />
                    )}
                  </div>
                )}
                
                <video
                  data-video-id={video.id}
                  ref={(el) => {
                    if (el && !videoThumbnails[video.id] && !video.thumbnailUrl) {
                      // Set up enhanced thumbnail generation
                      el.preload = 'metadata'
                      
                      const attemptThumbnailGeneration = async () => {
                        await generateThumbnail(el, video.id)
                      }
                      
                      // Try multiple events for better compatibility
                      el.addEventListener('loadedmetadata', attemptThumbnailGeneration)
                      el.addEventListener('loadeddata', attemptThumbnailGeneration)
                      el.addEventListener('canplay', attemptThumbnailGeneration)
                      
                      // Load video to trigger events
                      el.load()
                    }
                  }}
                  src={video.permanentUrl || video.url}
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                    hoveredVideo === video.id ? "opacity-100 z-10" : "opacity-0 z-0"
                  )}
                  style={{ display: hoveredVideo === video.id ? 'block' : 'none' }}
                  muted
                  loop
                  playsInline
                  preload="none"
                  onLoadStart={() => {
                    setLoadingVideos(prev => new Set(prev).add(video.id));

                    // Set a timeout to remove from loading after 10 seconds
                    const timeout = setTimeout(() => {
                      setLoadingVideos(prev => {
                        const next = new Set(prev);
                        next.delete(video.id);
                        return next;
                      });
                      loadingTimeouts.current.delete(video.id);
                    }, 10000);

                    loadingTimeouts.current.set(video.id, timeout);
                  }}
                  onCanPlay={() => {
                    // Clear the loading timeout
                    const timeout = loadingTimeouts.current.get(video.id);
                    if (timeout) {
                      clearTimeout(timeout);
                      loadingTimeouts.current.delete(video.id);
                    }

                    setLoadingVideos(prev => {
                      const next = new Set(prev);
                      next.delete(video.id);
                      return next;
                    });
                  }}
                  onError={(e) => {
                    const target = e.currentTarget;
                    const errorCode = target.error?.code;
                    const networkState = target.networkState;
                    const readyState = target.readyState;

                    // Only log basic error info, not the entire video object
                    console.warn(`[VideoGallery] Video failed to load:`, {
                      id: video.id,
                      errorCode,
                      networkState,
                      readyState,
                      url: video.url?.substring(0, 50) + '...'
                    });

                    setLoadingVideos(prev => {
                      const next = new Set(prev);
                      next.delete(video.id);
                      return next;
                    });

                    // Clear timeout if exists
                    const timeout = loadingTimeouts.current.get(video.id);
                    if (timeout) {
                      clearTimeout(timeout);
                      loadingTimeouts.current.delete(video.id);
                    }

                    // Don't retry for invalid URLs
                    if (!isValidVideoUrl(video.url)) {
                      return;
                    }

                    // Retry with direct URL if video fails to load
                    if (!target.dataset.retried) {
                      target.dataset.retried = 'true';
                      target.load();
                    }
                  }}
                  {...(hoveredVideo === video.id && { autoPlay: true })}
                />
              </>
            ) : (
              // Invalid URL display
              <div className="absolute inset-0 bg-red-900/20 flex flex-col items-center justify-center p-4">
                <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
                <p className="text-sm text-red-400 font-medium mb-1">Video Unavailable</p>
                <p className="text-xs text-red-300 text-center">
                  {getInvalidVideoMessage(video)}
                </p>
              </div>
            )}

            {/* Loading overlay - show when hovering and video is loading */}
            {(loadingVideos.has(video.id) || (hoveredVideo === video.id && !videoThumbnails[video.id] && !video.thumbnailUrl)) && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}

            {/* Play button overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Play className="h-12 w-12 text-white drop-shadow-lg" />
            </div>

            {/* Duration badge */}
            {video.duration && (
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                {video.duration}s
              </div>
            )}

            {/* Actions overlay */}
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Regenerate thumbnail button */}
              {!thumbnailGenerating.has(video.id) && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 bg-blue-600/80 hover:bg-blue-700/80"
                  onClick={async (e) => {
                    e.stopPropagation()
                    // Try to regenerate from URL first
                    await generateThumbnailFromUrl(video.url, video.id)
                  }}
                  title="Regenerate Thumbnail"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-black/60 hover:bg-black/80"
                onClick={(e) => {
                  e.stopPropagation()
                  const link = document.createElement('a')
                  link.href = video.url
                  link.download = `video-${video.id}.mp4`
                  link.click()
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
              {onVideoDelete && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 bg-black/60 hover:bg-red-600/80"
                  onClick={(e) => {
                    e.stopPropagation()
                    onVideoDelete(video.id)
                    // Also remove from thumbnail cache
                    removeCachedThumbnail(video.id)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Title below video */}
        <div className="mt-2 px-1">
          <p className="text-sm text-gray-300 truncate" title={video.prompt}>
            {video.prompt}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {video.status === 'completed' && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="text-xs text-gray-500">Completed</span>
              </div>
            )}
            {video.model && (
              <span className="text-xs text-gray-500 capitalize">{video.model}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={cn("grid grid-cols-2 gap-4 p-4", className)}>
        {organizedVideos.length === 0 ? (
          <div className="col-span-2 flex flex-col items-center justify-center py-12 text-gray-500">
            <VideoIcon className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No videos yet</p>
            <p className="text-xs mt-1">Generate videos from images or text prompts</p>
          </div>
        ) : (
          organizedVideos.map((video) => (
            <div key={video.id}>
              {renderVideoCard(video)}
            </div>
          ))
        )}
      </div>

      {/* Video Player Modal */}
      <VideoPlayerModal
        video={selectedVideo}
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        onAnalyze={onAnalyze}
        onTranscribe={onTranscribe}
      />
    </>
  )
}
