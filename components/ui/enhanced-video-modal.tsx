"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Download,
  X,
  SkipBack,
  SkipForward,
  Loader2
} from "lucide-react"
import { cn, formatVideoDuration } from "@/lib/utils"

interface EnhancedVideoModalProps {
  isOpen: boolean
  onClose: () => void
  file: {
    name: string
    url?: string
    geminiFileUri?: string
    contentType: string
    videoThumbnail?: string
    videoDuration?: number
  }
  onAnalyze?: (fileName: string, contentType: string) => void
  onReverseEngineer?: (fileName: string, contentType: string) => void
}

export function EnhancedVideoModal({
  isOpen,
  onClose,
  file,
  onAnalyze,
  onReverseEngineer
}: EnhancedVideoModalProps) {
  // Debug log the file data when modal opens
  useEffect(() => {
    if (isOpen && file) {
      console.log('[ENHANCED VIDEO MODAL] File data received:', {
        name: file.name,
        hasUrl: !!file.url,
        url: file.url,
        hasGeminiFileUri: !!file.geminiFileUri,
        geminiFileUri: file.geminiFileUri,
        contentType: file.contentType,
        hasVideoThumbnail: !!file.videoThumbnail,
        videoThumbnailLength: file.videoThumbnail?.length || 0,
        videoDuration: file.videoDuration
      })
    }
  }, [isOpen, file])
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null)

  // Handle video events
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setIsLoading(false)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [])

  // Auto-hide controls
  useEffect(() => {
    if (controlsTimeout) {
      clearTimeout(controlsTimeout)
    }

    if (showControls && isPlaying) {
      const timeout = setTimeout(() => {
        setShowControls(false)
      }, 3000)
      setControlsTimeout(timeout)
    }

    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout)
      }
    }
  }, [showControls, isPlaying])

  const togglePlayPause = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }

  const handleSeek = (value: number[]) => {
    const video = videoRef.current
    if (!video) return

    const newTime = (value[0] / 100) * duration
    video.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current
    if (!video) return

    const newVolume = value[0] / 100
    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    if (isMuted) {
      video.volume = volume
      setIsMuted(false)
    } else {
      video.volume = 0
      setIsMuted(true)
    }
  }

  const skip = (seconds: number) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds))
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleMouseMove = () => {
    setShowControls(true)
  }

  const isInstagramVideo = file.name.toLowerCase().includes('instagram')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "bg-black border-gray-800 text-white p-0 overflow-hidden",
        "w-[95vw] max-w-6xl h-[90vh] max-h-[90vh]",
        "flex flex-col"
      )}>
        <DialogHeader className="flex-shrink-0 p-4 border-b border-gray-800">
          <DialogTitle className="text-white flex items-center gap-2 text-sm truncate">
            {isInstagramVideo && (
              <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-xs text-white font-bold">IG</span>
              </div>
            )}
            <span className="truncate">{file.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div
          className="flex-1 relative bg-black overflow-hidden"
          onMouseMove={handleMouseMove}
        >
          {file.url ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                poster={file.videoThumbnail}
                onClick={togglePlayPause}
                controls={false}
                onLoadedMetadata={() => {
                  console.log('[ENHANCED VIDEO MODAL] Video loaded successfully')
                  setIsLoading(false)
                }}
                onError={(e) => {
                  console.error('[ENHANCED VIDEO MODAL] Video load error:', e)
                  setIsLoading(false)
                }}
              >
                <source src={file.url} type={file.contentType} />
                Your browser does not support the video element.
              </video>

              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}

              {/* Controls overlay */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent",
                "transition-opacity duration-300",
                showControls ? "opacity-100" : "opacity-0"
              )}>
                {/* Top controls */}
                <div className="absolute top-4 right-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Center play button */}
                {!isPlaying && !isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={togglePlayPause}
                      className="bg-black/60 hover:bg-black/80 text-white rounded-full p-4"
                    >
                      <Play className="w-8 h-8" />
                    </Button>
                  </div>
                )}

                {/* Bottom controls */}
                <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <Slider
                      value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
                      onValueChange={handleSeek}
                      max={100}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-white/80">
                      <span>{formatVideoDuration(currentTime)}</span>
                      <span>{formatVideoDuration(duration)}</span>
                    </div>
                  </div>

                  {/* Control buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={togglePlayPause}
                        className="text-white hover:bg-white/20"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => skip(-10)}
                        className="text-white hover:bg-white/20"
                      >
                        <SkipBack className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => skip(10)}
                        className="text-white hover:bg-white/20"
                      >
                        <SkipForward className="w-4 h-4" />
                      </Button>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleMute}
                          className="text-white hover:bg-white/20"
                        >
                          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </Button>
                        <Slider
                          value={[isMuted ? 0 : volume * 100]}
                          onValueChange={handleVolumeChange}
                          max={100}
                          className="w-20"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onAnalyze && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onAnalyze(file.name, file.contentType)
                            onClose()
                          }}
                          className="border-green-600/50 hover:bg-green-600/10 text-white"
                        >
                          🔍 Analyze
                        </Button>
                      )}

                      {onReverseEngineer && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onReverseEngineer(file.name, file.contentType)
                            onClose()
                          }}
                          className="border-blue-600/50 hover:bg-blue-600/10 text-white"
                        >
                          🔄 Reverse Engineer
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const a = document.createElement('a')
                          a.href = file.url!
                          a.download = file.name
                          a.click()
                        }}
                        className="text-white border-white/20 hover:bg-white/10"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleFullscreen}
                        className="text-white hover:bg-white/20"
                      >
                        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Play className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-400">Video not available</p>
                <p className="text-xs text-gray-500 mt-2">
                  {file ? `File: ${file.name}` : 'No file provided'}
                </p>
                {file && (
                  <p className="text-xs text-gray-500 mt-1">
                    URL: {file.url ? 'Present' : 'Missing'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
