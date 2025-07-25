"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, ExternalLink, Microscope, AudioLines } from "lucide-react"
import { GeneratedVideo } from "@/lib/video-generation-types"

interface VideoPlayerModalProps {
  video: GeneratedVideo | null
  isOpen: boolean
  onClose: () => void
  onAnalyze?: (video: GeneratedVideo) => void
  onTranscribe?: (video: GeneratedVideo) => void
}

export function VideoPlayerModal({ video, isOpen, onClose, onAnalyze, onTranscribe }: VideoPlayerModalProps) {
  if (!video) return null

  const handleDownload = async () => {
    try {
      const response = await fetch(video.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `video-${video.id}.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading video:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-[#2B2B2B] border-[#3A3A3A]">
        <DialogHeader>
          <DialogTitle>Generated Video</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Video Player */}
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <video
              src={video.url}
              controls
              autoPlay
              className="w-full h-full"
            />
          </div>

          {/* Video Info */}
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-1">Prompt</h4>
              <p className="text-white">{video.prompt}</p>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>{video.duration}s</span>
              <span>•</span>
              <span>{video.aspectRatio}</span>
              <span>•</span>
              <span className="capitalize">{video.model} model</span>
              {video.sourceImage && (
                <>
                  <span>•</span>
                  <span>From image</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-[#3A3A3A]">
            <div className="flex gap-2">
              {onAnalyze && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onAnalyze(video)
                    onClose()
                  }}
                  className="border-[#3A3A3A] hover:bg-blue-500/10 hover:border-blue-500/50"
                >
                  <Microscope className="h-4 w-4 mr-2" />
                  Analyze
                </Button>
              )}
              {onTranscribe && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onTranscribe(video)
                    onClose()
                  }}
                  className="border-[#3A3A3A] hover:bg-purple-500/10 hover:border-purple-500/50"
                >
                  <AudioLines className="h-4 w-4 mr-2" />
                  Transcribe
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(video.url, '_blank')}
                className="border-[#3A3A3A]"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                className="border-[#3A3A3A]"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}