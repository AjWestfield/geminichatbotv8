"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { ImageIcon, Monitor, Mic, Video } from "lucide-react"
import { BrowserView } from "@/components/browser-view"
import { ImageGallery } from "@/components/image-gallery"
import { GeneratedImage } from "@/lib/image-utils"
import { VideoGallery } from "@/components/video-gallery"
import { GeneratedVideo } from "@/lib/video-generation-types"
import { AudioGallery, type GeneratedAudio } from "@/components/audio-gallery"

interface CanvasState {
  selectedImageIds: string[]
  activeTab: string
  layout?: 'grid' | 'list' | 'masonry'
  filters?: {
    model?: string
    dateRange?: { start: Date; end: Date }
  }
}

interface CanvasViewProps {
  generatedImages?: GeneratedImage[]
  onImagesChange?: (images: GeneratedImage[]) => void
  generatedVideos?: GeneratedVideo[]
  onVideosChange?: (videos: GeneratedVideo[]) => void
  generatedAudios?: GeneratedAudio[]
  onAudiosChange?: (audios: GeneratedAudio[]) => void
  onAnimateImage?: (image: GeneratedImage) => void
  onCancelVideo?: (videoId: string) => void
  onVideoDelete?: (videoId: string) => void
  activeTab?: string
  onTabChange?: (tab: string) => void
  autoOpenEditImageId?: string | null
  imageEditingModel?: string
  chatId?: string
  canvasState?: CanvasState
  onCanvasStateChange?: (state: CanvasState) => void
}

export default function CanvasView({
  generatedImages = [],
  onImagesChange,
  generatedVideos = [],
  onVideosChange,
  generatedAudios = [],
  onAudiosChange,
  onAnimateImage,
  onCancelVideo,
  onVideoDelete,
  activeTab: controlledActiveTab,
  onTabChange,
  autoOpenEditImageId,
  imageEditingModel,
  chatId,
  canvasState,
  onCanvasStateChange
}: CanvasViewProps) {
  const [internalActiveTab, setInternalActiveTab] = useState("browser")
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([])

  // Initialize state from saved canvas state
  useEffect(() => {
    if (canvasState) {
      setInternalActiveTab(canvasState.activeTab || "browser")
      setSelectedImageIds(canvasState.selectedImageIds || [])
    }
  }, [canvasState, chatId]) // Reset when chat changes

  // Use controlled tab if provided, otherwise use internal state
  const activeTab = controlledActiveTab || internalActiveTab
  const setActiveTab = onTabChange || setInternalActiveTab

  // Save state when it changes
  useEffect(() => {
    if (onCanvasStateChange && chatId) {
      const state: CanvasState = {
        selectedImageIds,
        activeTab: activeTab || internalActiveTab,
        layout: 'grid' // Default layout, can be made configurable
      }
      onCanvasStateChange(state)
    }
  }, [selectedImageIds, activeTab, internalActiveTab, chatId, onCanvasStateChange])

  // Debug logging for images
  useEffect(() => {
    console.log('[CANVAS] Received images:', generatedImages?.length || 0)
    console.log('[CANVAS] Canvas state:', canvasState)
    console.log('[CANVAS] Selected image IDs:', selectedImageIds)
    if (generatedImages && generatedImages.length > 0 && generatedImages[0]) {
      console.log('[CANVAS] First image:', {
        id: generatedImages[0]?.id,
        model: generatedImages[0]?.model,
        prompt: generatedImages[0]?.prompt?.substring(0, 50)
      })
    }
  }, [generatedImages, canvasState, selectedImageIds])

  // Handle tab change with state saving
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (onCanvasStateChange && chatId) {
      onCanvasStateChange({
        ...canvasState,
        selectedImageIds,
        activeTab: tab
      } as CanvasState)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1E1E1E]">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full">
        <div className="flex items-center p-4 border-b border-[#333333] bg-[#1E1E1E]">
          <h2 className="text-lg font-semibold text-white mr-auto">Canvas</h2>
          <div className="flex-1 flex justify-center">
            <TabsList className="bg-[#2B2B2B]">
              <TabsTrigger value="browser" className="data-[state=active]:bg-[#3C3C3C] data-[state=active]:text-white">
                <Monitor className="h-4 w-4 mr-2" />
                Browser
              </TabsTrigger>
              <TabsTrigger value="audio" className="data-[state=active]:bg-[#3C3C3C] data-[state=active]:text-white">
                <Mic className="h-4 w-4 mr-2" />
                Audio
              </TabsTrigger>
              <TabsTrigger value="images" data-testid="images-tab" className="data-[state=active]:bg-[#3C3C3C] data-[state=active]:text-white">
                <ImageIcon className="h-4 w-4 mr-2" />
                Images
              </TabsTrigger>
              <TabsTrigger value="videos" data-testid="videos-tab" className="data-[state=active]:bg-[#3C3C3C] data-[state=active]:text-white">
                <Video className="h-4 w-4 mr-2" />
                Videos
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-auto bg-[#1E1E1E]">
          <TabsContent value="browser" className="h-full mt-0">
            <BrowserView className="w-full h-full" />
          </TabsContent>


          <TabsContent value="audio" className="h-full mt-0">
            <Card className="w-full h-full bg-[#1A1A1A] border-[#333333] overflow-hidden">
              <AudioGallery
                audios={generatedAudios}
                onAudiosChange={onAudiosChange}
              />
            </Card>
          </TabsContent>

          <TabsContent value="images" className="h-full mt-0">
            <Card className="w-full h-full bg-[#1A1A1A] border-[#333333] overflow-hidden">
              <ImageGallery
                images={generatedImages}
                onImagesChange={onImagesChange}
                onAnimateImage={onAnimateImage}
                autoOpenEditId={autoOpenEditImageId}
                imageEditingModel={imageEditingModel}
              />
            </Card>
          </TabsContent>

          <TabsContent value="videos" className="h-full mt-0">
            <Card className="w-full h-full bg-[#1A1A1A] border-[#333333] overflow-hidden">
              <VideoGallery
                videos={generatedVideos}
                onVideoDelete={onVideoDelete}
                onCancelVideo={onCancelVideo}
              />
            </Card>
          </TabsContent>


        </div>
      </Tabs>
    </div>
  )
}
