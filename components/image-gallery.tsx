"use client"

import { useState, useEffect, useMemo, useCallback, useRef, CSSProperties } from "react"
import { Download, Trash2, Search, Filter, Wand2, Video, CheckSquare, Square, Images, Maximize2, Minimize2, Sparkles, Copy, Merge } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { downloadImage, formatImageTimestamp, getQualityBadgeColor, saveGeneratedImages, loadGeneratedImages, clearImageStorage, validateImageUrl, isImageUrlLikelyExpired, preloadImage, imagePerformanceMonitor } from "@/lib/image-utils"
import { ImageEditModal } from "@/components/image-edit-modal"
// Temporarily using enhanced modal for debugging
import { ImageUpscaleModal } from "@/components/image-upscale-modal-enhanced"
import { MultiImageEditModal } from "@/components/multi-image-edit-modal"
import { MultiImageComposeModal } from "@/components/multi-image-compose-modal"
import { ImageLoadingCard } from "@/components/image-loading-card"
import { useImageProgressStore } from "@/lib/stores/image-progress-store"
import { Compare } from "@/components/ui/compare"

import { getSourceImagesForEdit } from "@/lib/database-operations"
import { toast } from "sonner"

interface StoredImage {
  id: string
  url: string
  prompt: string
  revised_prompt?: string
  quality: string
  style?: string
  size: string
  model: string
  created_at: string
  is_uploaded?: boolean
  original_image_id?: string
  metadata?: any
}

interface GeneratedImage {
  id: string
  url: string
  prompt: string
  revisedPrompt?: string
  timestamp: Date
  quality: 'standard' | 'hd' | 'wavespeed'
  style?: 'vivid' | 'natural'
  size: string
  model: string
  isGenerating?: boolean
  isUploaded?: boolean
  originalImageId?: string
  isUpscaled?: boolean
  upscaleSettings?: {
    factor: string
    model: string
  }
  metadata?: any
  geminiUri?: string
  sourceImages?: string[]
  inputImages?: any[]
  isMultiImageEdit?: boolean
}

interface ImageGalleryProps {
  images: GeneratedImage[]
  onImagesChange?: (images: GeneratedImage[]) => void
  onAnimateImage?: (image: GeneratedImage) => void
  autoOpenEditId?: string | null
  onEditComplete?: (editedImage: GeneratedImage) => void
  imageEditingModel?: string
}

export function ImageGallery({ images: propImages, onImagesChange, onAnimateImage, autoOpenEditId, onEditComplete, imageEditingModel }: ImageGalleryProps) {
  const [images, setImages] = useState<GeneratedImage[]>(Array.isArray(propImages) ? propImages : [])
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const [editingImage, setEditingImage] = useState<GeneratedImage | null>(null)
  const [upscalingImage, setUpscalingImage] = useState<GeneratedImage | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [qualityFilter, setQualityFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set())
  const [showMultiEditModal, setShowMultiEditModal] = useState(false)
  const [showMultiComposeModal, setShowMultiComposeModal] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [sourceImagesFromDb, setSourceImagesFromDb] = useState<Map<string, GeneratedImage[]>>(new Map())
  const [isAnimating, setIsAnimating] = useState(false)
  const [previousMultiImage, setPreviousMultiImage] = useState<GeneratedImage | null>(null)
  const [isFromMultiImage, setIsFromMultiImage] = useState(false)
  const [comparisonMode, setComparisonMode] = useState<'split' | 'slider'>('split')
  
  // Delete confirmation dialog state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<GeneratedImage | null>(null)
  
  // Bulk delete confirmation dialog state
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [selectedImagesToDelete, setSelectedImagesToDelete] = useState<GeneratedImage[]>([])


  // Get progress store data
  const { getAllGeneratingImages, removeProgress, calculateProgress } = useImageProgressStore()
  const generatingImages = getAllGeneratingImages()

  // Continuously update progress for all generating images
  useEffect(() => {
    const interval = setInterval(() => {
      generatingImages.forEach((progress) => {
        if (progress.status === 'generating') {
          calculateProgress(progress.imageId)
        }
      })
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [generatingImages, calculateProgress])

  // Handler functions
  const handleDownload = async (image: GeneratedImage, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await downloadImage(image.url, image.prompt)
      toast.success('Image downloaded successfully')
    } catch (error) {
      console.error('Error downloading image:', error)
      toast.error('Failed to download image')
    }
  }

  const handleCopyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt)
      toast.success('Prompt copied to clipboard')
    } catch (error) {
      console.error('Error copying prompt:', error)
      toast.error('Failed to copy prompt')
    }
  }

  // Show delete confirmation dialog
  const handleDelete = (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    // Find the image to delete
    const image = images.find(img => img.id === imageId)
    if (!image) return

    // Set image to delete and show confirmation dialog
    setImageToDelete(image)
    setShowDeleteConfirm(true)
  }

  // Cancel delete operation
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setImageToDelete(null)
  }

  // Perform actual deletion after confirmation
  const handleConfirmDelete = async () => {
    if (!imageToDelete) return

    // Close the confirmation dialog first
    setShowDeleteConfirm(false)
    
    const imageId = imageToDelete.id
    
    // Show loading toast
    const loadingToast = toast.loading('Deleting image...')

    try {
      console.log('[ImageGallery] Attempting to delete image:', {
        id: imageId,
        url: imageToDelete.url,
        isUploaded: imageToDelete.isUploaded
      })

      // Call the API to delete from database and blob storage
      const response = await fetch(`/api/images/${encodeURIComponent(imageId)}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('[ImageGallery] Delete API error:', {
          status: response.status,
          error: data.error,
          details: data.details
        })
        throw new Error(data.error || 'Failed to delete image')
      }

      // Only update local state if API call succeeded
      const updatedImages = images.filter(img => img.id !== imageId)
      setImages(updatedImages)
      onImagesChange?.(updatedImages)

      // Close modal if the deleted image was currently selected
      if (selectedImage && selectedImage.id === imageId) {
        setSelectedImage(null)
      }

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast)
      toast.success('Image deleted successfully')

      console.log('[ImageGallery] Image deleted successfully:', imageId)
    } catch (error: any) {
      console.error('[ImageGallery] Error deleting image:', error)

      // Dismiss loading toast and show error
      toast.dismiss(loadingToast)
      toast.error(error.message || 'Failed to delete image')
    } finally {
      // Reset delete state
      setImageToDelete(null)
    }
  }

  // Show bulk delete confirmation dialog
  const handleBulkDelete = () => {
    const imagesToDelete = Array.from(selectedImageIds)
      .map(id => images.find(img => img.id === id))
      .filter(Boolean) as GeneratedImage[]
    
    if (imagesToDelete.length === 0) return
    
    setSelectedImagesToDelete(imagesToDelete)
    setShowBulkDeleteConfirm(true)
  }

  // Cancel bulk delete operation
  const handleCancelBulkDelete = () => {
    setShowBulkDeleteConfirm(false)
    setSelectedImagesToDelete([])
  }

  // Perform actual bulk deletion after confirmation
  const handleConfirmBulkDelete = async () => {
    if (selectedImagesToDelete.length === 0) return

    // Close the confirmation dialog first
    setShowBulkDeleteConfirm(false)
    
    const totalImages = selectedImagesToDelete.length
    const loadingToast = toast.loading(`Deleting ${totalImages} images...`)

    try {
      let successCount = 0
      let failedCount = 0
      const failedImages: string[] = []
      const deletedImageIds: string[] = []

      // Delete each image sequentially to avoid overwhelming the API
      for (const image of selectedImagesToDelete) {
        try {
          console.log('[ImageGallery] Attempting to delete image:', {
            id: image.id,
            url: image.url,
            isUploaded: image.isUploaded
          })

          const response = await fetch(`/api/images/${encodeURIComponent(image.id)}`, {
            method: 'DELETE',
          })

          const data = await response.json()

          if (!response.ok) {
            console.error('[ImageGallery] Delete API error:', {
              status: response.status,
              error: data.error,
              details: data.details,
              imageId: image.id
            })
            failedCount++
            failedImages.push(image.prompt.substring(0, 30) + '...')
          } else {
            successCount++
            deletedImageIds.push(image.id) // Track successfully deleted images
            console.log('[ImageGallery] Image deleted successfully:', image.id)
          }
        } catch (error: any) {
          console.error('[ImageGallery] Error deleting image:', error, 'Image ID:', image.id)
          failedCount++
          failedImages.push(image.prompt.substring(0, 30) + '...')
        }
      }

      // Update local state - remove successfully deleted images
      const updatedImages = images.filter(img => !deletedImageIds.includes(img.id))
      setImages(updatedImages)
      onImagesChange?.(updatedImages)

      // Clear selection and exit selection mode
      clearSelection()

      // Close modal if any deleted image was currently selected
      if (selectedImage && deletedImageIds.includes(selectedImage.id)) {
        setSelectedImage(null)
      }

      // Show appropriate success/error messages
      toast.dismiss(loadingToast)
      
      if (successCount === totalImages) {
        toast.success(`Successfully deleted ${successCount} images`)
      } else if (successCount > 0) {
        toast.success(`Deleted ${successCount} of ${totalImages} images`)
        if (failedCount > 0) {
          toast.error(`Failed to delete ${failedCount} images`)
        }
      } else {
        toast.error('Failed to delete any images')
      }

      console.log('[ImageGallery] Bulk delete completed:', {
        total: totalImages,
        success: successCount,
        failed: failedCount
      })
    } catch (error: any) {
      console.error('[ImageGallery] Error during bulk delete:', error)
      toast.dismiss(loadingToast)
      toast.error('Failed to delete images')
    } finally {
      // Reset bulk delete state
      setSelectedImagesToDelete([])
    }
  }

  const findOriginalImage = (originalImageId: string): GeneratedImage | null => {
    // First try to find by direct ID match
    let originalImage = images.find(img => img.id === originalImageId)

    // If not found and it looks like a local ID, try to find by metadata
    if (!originalImage && originalImageId.startsWith('img_')) {
      originalImage = images.find(img =>
        img.metadata?.localId === originalImageId ||
        img.metadata?.originalImageId === originalImageId
      )
    }

    return originalImage || null
  }

  // Selection mode functions
  const toggleImageSelection = (imageId: string) => {
    setSelectedImageIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(imageId)) {
        newSet.delete(imageId)
      } else {
        newSet.add(imageId)
      }
      return newSet
    })
  }

  const clearSelection = () => {
    setSelectedImageIds(new Set())
    setSelectionMode(false)
  }

  const openMultiEditWithSelection = () => {
    if (selectedImageIds.size >= 1) {
      setShowMultiEditModal(true)
    }
  }

  // Smooth animation handler for opening modal
  const handleImageClick = (image: GeneratedImage) => {
    setIsAnimating(true)
    setSelectedImage(image)
    // Allow animation to start
    setTimeout(() => setIsAnimating(false), 50)
  }

  // Handle fullscreen toggle with smooth transition
  const toggleFullscreen = useCallback(() => {
    if (!isFullScreen) {
      // Entering fullscreen
      document.body.classList.add('modal-fullscreen-active')
      setIsFullScreen(true)
    } else {
      // Exiting fullscreen
      setIsFullScreen(false)
      setTimeout(() => {
        document.body.classList.remove('modal-fullscreen-active')
      }, 400)
    }
  }, [isFullScreen])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('modal-fullscreen-active')
    }
  }, [])

  // Log performance statistics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = imagePerformanceMonitor.getPerformanceStats()
      if (stats.totalImages > 0) {
        console.log('[ImageGallery] Performance Statistics:', {
          totalImages: stats.totalImages,
          successRate: `${stats.successRate.toFixed(1)}%`,
          averageLoadTime: `${stats.averageLoadTime.toFixed(2)}ms`,
          slowLoads: stats.slowLoads,
          retryRate: `${stats.retryRate.toFixed(1)}%`,
          urlTypeBreakdown: stats.urlTypeBreakdown
        })
      }
    }, 30000) // Log every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Sync with prop changes and validate image URLs
  useEffect(() => {
    const safeImages = Array.isArray(propImages) ? propImages : []
    console.log('[IMAGE_GALLERY] Prop images changed:', safeImages.length)

    // Check for potentially expired URLs and log warnings
    safeImages.forEach(image => {
      if (isImageUrlLikelyExpired(image.url)) {
        console.warn('[ImageGallery] Image URL likely expired:', {
          id: image.id,
          url: image.url,
          timestamp: image.timestamp,
          prompt: image.prompt.substring(0, 50) + '...'
        })
      }
    })

    setImages(safeImages)
  }, [propImages])

  // Keyboard shortcuts for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return

      // F for fullscreen
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        setIsFullScreen(!isFullScreen)
      }
      // E for edit
      else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        setSelectedImage(null)
        setEditingImage(selectedImage)
      }
      // D for download
      else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        handleDownload(selectedImage, { stopPropagation: () => {} } as React.MouseEvent)
      }
      // C for copy prompt
      else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        handleCopyPrompt(selectedImage.prompt)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedImage, isFullScreen, handleDownload, handleCopyPrompt, setEditingImage])

  // Auto-open edit modal if specified
  useEffect(() => {
    if (autoOpenEditId && images.length > 0) {
      const imageToEdit = images.find(img => img.id === autoOpenEditId)
      if (imageToEdit) {
        console.log('[ImageGallery] Auto-opening edit modal for image:', autoOpenEditId)
        setEditingImage(imageToEdit)
      }
    }
  }, [autoOpenEditId, images])

  // Filter images based on search and quality
  const filteredImages = images
    .filter((image, index, array) => {
      // Deduplicate by ID (keep only the first occurrence)
      return array.findIndex(img => img.id === image.id) === index
    })
    .filter(image => {
      // Exclude generating images (they're shown separately via ImageLoadingCard)
      if (image.isGenerating) {
        return false
      }
      
      // Exclude images without valid URLs
      if (!image.url || image.url.trim() === '') {
        return false
      }

      const matchesSearch = searchQuery === "" ||
        image.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        image.revisedPrompt?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesQuality = qualityFilter === "all" || image.quality === qualityFilter

      return matchesSearch && matchesQuality
    })



  if (images.length === 0 && generatingImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-20 h-20 rounded-full bg-[#2B2B2B] flex items-center justify-center mb-4">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="No images">
            <title>No images</title>
            <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M17 8L12 3L7 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 3V15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No Images Generated Yet</h3>
        <p className="text-[#B0B0B0] max-w-sm">
          Start generating images by typing prompts like "Generate an image of..." in the chat.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" data-testid="image-gallery">
      {/* Header with search and filters */}
      <div className="p-4 border-b border-[#333333] space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#2B2B2B] border-[#333333] text-white placeholder:text-gray-500"
            />
          </div>
          <Select value={qualityFilter} onValueChange={setQualityFilter}>
            <SelectTrigger className="w-[140px] bg-[#2B2B2B] border-[#333333] text-white">
              <Filter className="w-4 h-4 mr-1.5" />
              <SelectValue placeholder="Quality" />
            </SelectTrigger>
            <SelectContent className="bg-[#2B2B2B] border-[#333333]">
              <SelectItem value="all">All Quality</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant={selectionMode ? "default" : "outline"}
            onClick={() => {
              setSelectionMode(!selectionMode)
              if (!selectionMode) {
                setSelectedImageIds(new Set())
              }
            }}
            className={cn(
              "border-[#333333]",
              selectionMode ? "bg-purple-600 hover:bg-purple-700 border-purple-600" : "hover:bg-[#2B2B2B]"
            )}
          >
            {selectionMode ? <CheckSquare className="w-4 h-4 mr-2" /> : <Square className="w-4 h-4 mr-2" />}
            <span className="flex items-center gap-1">
              Select
              {!selectionMode && (
                <>
                  <span className="mx-1 text-gray-500">•</span>
                  <Wand2 className="w-3 h-3 text-purple-400" />
                  <Trash2 className="w-3 h-3 text-red-400" />
                </>
              )}
            </span>
          </Button>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-400">
              {filteredImages.length + generatingImages.length} {filteredImages.length + generatingImages.length === 1 ? 'image' : 'images'}
              {generatingImages.length > 0 && ` (${generatingImages.length} generating)`}
            </span>
            {selectionMode && (
              <div className="flex items-center gap-2">
                <span className="text-purple-400">
                  {selectedImageIds.size} selected
                </span>
                {selectedImageIds.size > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-purple-400 hover:text-purple-300 underline text-xs"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            )}
          </div>
          {selectionMode && selectedImageIds.size >= 1 && (
            <TooltipProvider>
              <div className="flex gap-2 items-center">
                {selectedImageIds.size === 1 ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          size="sm"
                          disabled
                          className="bg-gray-600 text-gray-400 cursor-not-allowed"
                        >
                          <Images className="w-4 h-4 mr-2" />
                          Multi Image Edit ({selectedImageIds.size})
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#2B2B2B] border-[#333333] text-white max-w-xs">
                      <p className="text-sm">Select 2 or more images to seamlessly blend them into a single image</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    size="sm"
                    onClick={openMultiEditWithSelection}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Images className="w-4 h-4 mr-2" />
                    Multi Image Edit ({selectedImageIds.size})
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({selectedImageIds.size})
                </Button>
              </div>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Image Grid */}
      <ScrollArea className="flex-1 p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Show generating images first */}
          {generatingImages.map((progress) => (
            <ImageLoadingCard
              key={progress.imageId}
              imageId={progress.imageId}
              onCancel={(id) => {
                removeProgress(id)
              }}
            />
          ))}

          {/* Then show completed images */}
          {filteredImages.map((image) => {
            // Skip if this image is currently generating
            if (generatingImages.some(g => g.imageId === image.id)) {
              return null
            }

            const isSelected = selectedImageIds.has(image.id)

            return (
              <div
                key={image.id}
                className={cn(
                  "group relative aspect-square rounded-lg overflow-hidden bg-[#1A1A1A] hover:ring-2 transition-all w-full",
                  selectionMode && isSelected
                    ? "ring-2 ring-purple-500 hover:ring-purple-400"
                    : "hover:ring-white/20"
                )}
              >
                {/* Clickable overlay */}
                <button
                  type="button"
                  className="absolute inset-0 w-full h-full bg-transparent cursor-pointer z-10"
                  onClick={() => {
                    if (selectionMode) {
                      toggleImageSelection(image.id)
                    } else {
                      handleImageClick(image)
                    }
                  }}
                  aria-label={selectionMode ? `Toggle selection: ${image.prompt}` : `View image: ${image.prompt}`}
                  disabled={image.isGenerating}
                />

                {/* Selection checkbox overlay */}
                {selectionMode && (
                  <div className="absolute top-2 left-2 z-20 pointer-events-none">
                    <div className={cn(
                      "w-6 h-6 rounded border-2 flex items-center justify-center",
                      isSelected
                        ? "bg-purple-600 border-purple-600"
                        : "bg-black/50 border-white/50"
                    )}>
                      {isSelected && <CheckSquare className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                )}

                {image.url ? (
                  <img
                    src={image.url}
                    alt={image.prompt}
                    className="w-full h-full object-cover rounded-lg"
                    loading="lazy"
                    onLoadStart={() => {
                      imagePerformanceMonitor.startTracking(image.id, image.url)
                    }}
                    onError={(e) => {
                      const target = e.currentTarget
                      const errorEvent = e.nativeEvent as ErrorEvent

                      // Enhanced error logging with detailed information
                      const errorDetails = {
                        url: image.url,
                        id: image.id,
                        imageTimestamp: image.timestamp,
                        isReplicateUrl: image.url?.includes('replicate.delivery') || false,
                        isBlobUrl: image.url?.includes('blob.vercel-storage.com') || false,
                        isDataUrl: image.url?.startsWith('data:') || false,
                        urlLength: image.url?.length || 0,
                        errorType: errorEvent?.type || 'unknown',
                        errorMessage: errorEvent?.message || 'No error message',
                        targetSrc: target.src,
                        targetComplete: target.complete,
                        targetNaturalWidth: target.naturalWidth,
                        targetNaturalHeight: target.naturalHeight,
                        networkState: (target as any).networkState,
                        readyState: (target as any).readyState,
                        userAgent: navigator.userAgent,
                        errorTimestamp: new Date().toISOString()
                      }

                      console.error('[ImageGallery] Image failed to load:', errorDetails)

                      // Prevent multiple error handlers from running
                      if (target.dataset.errorHandled) return
                      target.dataset.errorHandled = 'true'

                      // Try to reload the image once before showing error
                      if (!target.dataset.retryAttempted) {
                        target.dataset.retryAttempted = 'true'
                        imagePerformanceMonitor.recordRetry(image.id)
                        console.log('[ImageGallery] Attempting to retry image load:', image.id)
                        setTimeout(() => {
                          target.src = image.url + '?retry=' + Date.now()
                        }, 1000)
                        return
                      }

                      // Record error metrics
                      imagePerformanceMonitor.recordError(image.id, `${errorDetails.errorType}: ${errorDetails.errorMessage}`)

                      // Replace with enhanced broken image placeholder
                      target.style.display = 'none'

                      // Show enhanced broken image indicator
                      const parent = target.parentElement
                      if (parent && !parent.querySelector('.broken-image-indicator')) {
                        const isReplicateUrl = image.url?.includes('replicate.delivery') || false
                        const isBlobUrl = image.url?.includes('blob.vercel-storage.com') || false
                        const brokenDiv = document.createElement('div')
                        brokenDiv.className = 'broken-image-indicator w-full h-full bg-[#1A1A1A] flex items-center justify-center border-2 border-dashed border-red-500/30 cursor-pointer hover:border-red-500/50 transition-colors'
                        brokenDiv.innerHTML = `
                          <div class="text-center p-4">
                            <div class="text-red-400 mb-2">⚠️</div>
                            <p class="text-xs text-red-400 font-medium">Image unavailable</p>
                            <p class="text-xs text-gray-500 mt-1">
                              ${isReplicateUrl ? 'Replicate URL expired (24h limit)' :
                                isBlobUrl ? 'Blob storage URL may be invalid' :
                                'URL may have expired or be inaccessible'}
                            </p>
                            <p class="text-xs text-gray-400 mt-2">Click to retry loading</p>
                          </div>
                        `

                        // Add click handler to retry loading
                        brokenDiv.addEventListener('click', () => {
                          console.log('[ImageGallery] Manual retry requested for image:', image.id)
                          brokenDiv.remove()
                          target.style.display = 'block'
                          target.dataset.errorHandled = ''
                          target.dataset.retryAttempted = ''
                          target.src = image.url + '?manual_retry=' + Date.now()
                        })

                        parent.appendChild(brokenDiv)
                      }
                    }}
                    onLoad={(e) => {
                      const target = e.currentTarget

                      // Record performance metrics
                      imagePerformanceMonitor.recordSuccess(
                        image.id,
                        target.naturalWidth,
                        target.naturalHeight,
                        target.src.length
                      )

                      console.log('[ImageGallery] Image loaded successfully:', {
                        id: image.id,
                        url: image.url,
                        naturalWidth: target.naturalWidth,
                        naturalHeight: target.naturalHeight,
                        fileSize: target.src.length,
                        isReplicateUrl: image.url?.includes('replicate.delivery') || false,
                        isBlobUrl: image.url?.includes('blob.vercel-storage.com') || false,
                        isDataUrl: image.url?.startsWith('data:') || false,
                        loadTimestamp: new Date().toISOString(),
                        wasRetried: target.dataset.retryAttempted === 'true'
                      })

                      // Clear any retry flags since image loaded successfully
                      target.dataset.errorHandled = ''
                      target.dataset.retryAttempted = ''
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center">
                    <div className="text-center p-4">
                      <p className="text-xs text-gray-400 mt-2">
                        Loading...
                      </p>
                    </div>
                  </div>
                )}

                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="absolute top-2 right-2 flex gap-2 pointer-events-auto z-20">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 bg-black/50 hover:bg-black/70"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingImage(image)
                      }}
                      disabled={image.isGenerating || !image.url}
                      title="Edit image"
                    >
                      <Wand2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 bg-black/50 hover:bg-black/70"
                      onClick={(e) => handleDownload(image, e)}
                      disabled={image.isGenerating || !image.url}
                      title="Download image"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 bg-black/50 hover:bg-black/70"
                      onClick={(e) => handleDelete(image.id, e)}
                      disabled={image.isGenerating}
                      title="Delete image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {!image.isUpscaled && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8 bg-black/50 hover:bg-black/70"
                        onClick={(e) => {
                          e.stopPropagation()
                          setUpscalingImage(image)
                        }}
                        disabled={image.isGenerating || !image.url}
                        title="Upscale image"
                      >
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    )}
                    {onAnimateImage && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8 bg-black/50 hover:bg-black/70"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAnimateImage(image)
                        }}
                        disabled={image.isGenerating || !image.url}
                        title="Animate image"
                      >
                        <Video className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Image info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-medium line-clamp-2 mb-1">
                      {image.prompt}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn("text-xs border", getQualityBadgeColor(image.quality))}
                      >
                        {image.quality}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {formatImageTimestamp(image.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Selected Image Modal */}
      {selectedImage && (
        <Dialog
          open={!!selectedImage}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedImage(null)
              setIsFullScreen(false)
              setIsAnimating(false)
              setIsFromMultiImage(false)
              setPreviousMultiImage(null)
              document.body.classList.remove('modal-fullscreen-active')
            }
          }}>
            <DialogContent
              className={cn(
                "bg-[#1A1A1A] border-[#333333] p-0 flex flex-col overflow-hidden",
                isFullScreen
                  ? "!fixed !inset-0 !w-screen !h-screen !max-w-none !max-h-none !rounded-none !m-0 !translate-x-0 !translate-y-0 !left-0 !top-0 !z-[9999] compact-modal-transition fullscreen-modal"
                  : "sm:max-w-4xl h-[85vh] max-h-[85vh] max-w-[95vw] rounded-lg compact-modal-transition",
                // Smooth animation on mount
                isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
              )}
              onPointerDownOutside={(e) => {
                if (isFullScreen) e.preventDefault()
              }}>
            {/* Compact header */}
            <DialogHeader className={cn(
              "flex-shrink-0 border-b border-[#333333] px-3 pr-12 py-2 h-12 relative"
            )}>
              <DialogTitle className="flex items-center justify-between h-full">
                <div className="flex items-center gap-2">
                  {isFromMultiImage && previousMultiImage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        // Go back to multi-image comparison view
                        setSelectedImage(previousMultiImage);
                        setIsFromMultiImage(false);
                        setPreviousMultiImage(null);
                      }}
                      className="text-xs hover:bg-[#2B2B2B] h-6 px-2"
                    >
                      ←
                    </Button>
                  )}
                  <span className="text-sm font-medium text-gray-300">
                    {selectedImage.isMultiImageComposition && selectedImage.inputImages && selectedImage.inputImages.length > 0
                      ? "Multi-Image Composition"
                      : selectedImage.isMultiImageEdit && selectedImage.inputImages && selectedImage.inputImages.length > 0
                      ? "Multi-Image Comparison"
                      : selectedImage.originalImageId && findOriginalImage(selectedImage.originalImageId)
                      ? "Image Comparison"
                      : "Generated Image"}
                  </span>
                </div>
                {/* Only fullscreen toggle in header - positioned to avoid close button */}
                <div className="absolute right-12 top-1/2 -translate-y-1/2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleFullscreen}
                    className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10"
                    title={isFullScreen ? "Exit fullscreen" : "Enter fullscreen"}
                  >
                    {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>

            {/* Main content area - compact layout */}
            <div className={cn(
              "flex-1 flex flex-col min-h-0 overflow-hidden",
              isFullScreen ? "h-[calc(100vh-3rem)] bg-[#0A0A0A]" : ""
            )}>
              {/* Multi-Image Edit/Composition Comparison View */}
              {(selectedImage.isMultiImageEdit || selectedImage.isMultiImageComposition) && selectedImage.inputImages && selectedImage.inputImages.length > 0 ? (
                // Multi-image comparison view
                <>
                  {/* Multi-Image Comparison Display */}
                  <div className={cn(
                    "flex-1 min-h-0",
                    isFullScreen ? "p-8" : "p-4"
                  )}>
                    <div className="relative h-full bg-[#0A0A0A] rounded-xl overflow-hidden shadow-2xl">
                      <div className={cn(
                        "flex h-full gap-4",
                        isFullScreen ? "p-6" : "p-3"
                      )}>
                        {/* Generated Result - Larger on the left */}
                        <div className="flex-[2] relative">
                          <div className="h-full bg-[#111111] rounded-lg p-2 shadow-inner">
                            <div className="absolute top-3 left-3 z-10 bg-purple-600 text-white text-xs px-2 py-1 rounded-md font-medium shadow-lg flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Result
                            </div>
                            <div 
                              className="w-full h-full cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all rounded-lg overflow-hidden"
                              onClick={() => {
                                // Create a clean image object for single view (without multi-image properties)
                                const cleanImage: GeneratedImage = {
                                  id: selectedImage.id,
                                  url: selectedImage.url,
                                  prompt: selectedImage.prompt,
                                  revisedPrompt: selectedImage.revisedPrompt,
                                  timestamp: selectedImage.timestamp,
                                  quality: selectedImage.quality,
                                  style: selectedImage.style,
                                  size: selectedImage.size,
                                  model: selectedImage.model,
                                  isGenerating: selectedImage.isGenerating,
                                  isUploaded: selectedImage.isUploaded,
                                  isUpscaled: selectedImage.isUpscaled,
                                  upscaleSettings: selectedImage.upscaleSettings,
                                  metadata: selectedImage.metadata,
                                  geminiUri: selectedImage.geminiUri,
                                  originalImageId: selectedImage.originalImageId
                                  // Intentionally excluding: isMultiImageEdit, isMultiImageComposition, inputImages, sourceImages
                                };
                                
                                // Store the multi-image data for back navigation
                                setPreviousMultiImage(selectedImage);
                                setIsFromMultiImage(true);
                                
                                // Direct transition without delay
                                setSelectedImage(cleanImage);
                              }}
                            >
                              <img
                                src={selectedImage.url}
                                alt="Generated"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.currentTarget
                                  target.style.display = 'none'
                                  const parent = target.parentElement
                                  if (parent && !parent.querySelector('.result-error')) {
                                    const errorDiv = document.createElement('div')
                                    errorDiv.className = 'result-error w-full h-full bg-red-900/20 flex items-center justify-center text-red-400 rounded'
                                    errorDiv.innerHTML = '<div class="text-center"><div>⚠️</div><div class="text-xs">Failed to load</div></div>'
                                    parent.appendChild(errorDiv)
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        {/* Source Images - Dynamic grid on the right */}
                        <div className="flex-1 relative bg-[#111111] rounded-lg p-2 shadow-inner">
                          <div className="absolute top-3 left-3 z-10 bg-black/80 text-white text-xs px-2 py-0.5 rounded-md font-medium">
                            Source Images ({selectedImage.inputImages.length})
                          </div>
                          <div className={cn(
                            "h-full pt-8",
                            selectedImage.inputImages.length > 6 ? "overflow-y-auto custom-scrollbar" : ""
                          )}>
                            <div className={cn(
                              "grid gap-2 h-full",
                              selectedImage.inputImages.length === 2 ? "grid-cols-1" :
                              selectedImage.inputImages.length <= 4 ? "grid-cols-2" :
                              selectedImage.inputImages.length <= 6 ? "grid-cols-2 grid-rows-3" :
                              "grid-cols-3"
                            )}>
                              {selectedImage.inputImages.map((sourceUrl, index) => (
                                <div 
                                  key={index} 
                                  className="relative bg-[#0A0A0A] rounded-lg overflow-hidden shadow-md cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group"
                                  onClick={() => {
                                    // Create a temporary image object for the source image
                                    const sourceImage: GeneratedImage = {
                                      id: `source-${selectedImage.id}-${index}`,
                                      url: sourceUrl,
                                      prompt: `Source Image ${index + 1} (from ${selectedImage.prompt})`,
                                      timestamp: selectedImage.timestamp,
                                      quality: selectedImage.quality,
                                      size: selectedImage.size,
                                      model: selectedImage.model
                                    };
                                    
                                    // Store the multi-image data for back navigation
                                    setPreviousMultiImage(selectedImage);
                                    setIsFromMultiImage(true);
                                    
                                    // Direct transition without delay
                                    setSelectedImage(sourceImage);
                                  }}
                                >
                                  <img
                                    src={sourceUrl}
                                    alt={`Source ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.currentTarget
                                      target.style.display = 'none'
                                      const parent = target.parentElement
                                      if (parent && !parent.querySelector('.source-error')) {
                                        const errorDiv = document.createElement('div')
                                        errorDiv.className = 'source-error w-full h-full bg-red-900/20 flex items-center justify-center text-red-400'
                                        errorDiv.innerHTML = '<div class="text-center"><div>⚠️</div><div class="text-xs">Failed</div></div>'
                                        parent.appendChild(errorDiv)
                                      }
                                    }}
                                  />
                                  <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-medium shadow-sm">
                                    {index + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : selectedImage.originalImageId && findOriginalImage(selectedImage.originalImageId) ? (
                // Single image comparison view
                <>
                  {/* Comparison mode controls */}
                  <div className="flex-shrink-0 flex items-center justify-center gap-2 px-3 py-1.5 border-b border-[#333333]">
                    <Button
                      size="sm"
                      variant={comparisonMode === 'split' ? 'default' : 'outline'}
                      onClick={() => setComparisonMode('split')}
                      className="h-7 text-xs px-3"
                    >
                      Split Screen
                    </Button>
                    <Button
                      size="sm"
                      variant={comparisonMode === 'slider' ? 'default' : 'outline'}
                      onClick={() => setComparisonMode('slider')}
                      className="h-7 text-xs px-3"
                    >
                      Slider
                    </Button>
                  </div>

                  {/* Image container - takes remaining space */}
                  <div className="flex-1 min-h-0 p-2">
                    <div className="relative h-full bg-[#0A0A0A] rounded-lg overflow-hidden">
                      {comparisonMode === 'split' ? (
                        <div className="flex h-full gap-2">
                          <div className="flex-1 relative cursor-pointer group min-h-[200px] rounded-lg overflow-hidden bg-[#111111] hover:bg-[#1A1A1A] transition-all duration-200 border-2 border-transparent hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20"
                            onClick={() => {
                              const originalImage = findOriginalImage(selectedImage.originalImageId);
                              if (originalImage) {
                                // Create a clean image object for single view
                                const cleanOriginalImage: GeneratedImage = {
                                  id: originalImage.id,
                                  url: originalImage.url,
                                  prompt: originalImage.prompt,
                                  revisedPrompt: originalImage.revisedPrompt,
                                  timestamp: originalImage.timestamp,
                                  quality: originalImage.quality,
                                  style: originalImage.style,
                                  size: originalImage.size,
                                  model: originalImage.model,
                                  isGenerating: originalImage.isGenerating,
                                  isUploaded: originalImage.isUploaded,
                                  isUpscaled: originalImage.isUpscaled,
                                  upscaleSettings: originalImage.upscaleSettings,
                                  metadata: originalImage.metadata,
                                  geminiUri: originalImage.geminiUri
                                  // Note: originalImageId removed to show as single image view
                                };
                                
                                // Store the comparison state for back navigation
                                setPreviousMultiImage(selectedImage);
                                setIsFromMultiImage(true);
                                
                                // Direct transition to focus modal
                                setSelectedImage(cleanOriginalImage);
                              }
                            }}
                          >
                            <img
                              src={findOriginalImage(selectedImage.originalImageId)!.url}
                              alt="Original"
                              className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                              onError={(e) => {
                                const target = e.currentTarget
                                const originalImage = findOriginalImage(selectedImage.originalImageId)
                                const errorEvent = e.nativeEvent as ErrorEvent

                                const errorDetails = {
                                  url: originalImage?.url,
                                  originalImageId: selectedImage.originalImageId,
                                  context: 'modal-comparison-original',
                                  errorType: errorEvent?.type || 'unknown',
                                  errorMessage: errorEvent?.message || 'No error message',
                                  targetSrc: target.src,
                                  targetComplete: target.complete,
                                  targetNaturalWidth: target.naturalWidth,
                                  targetNaturalHeight: target.naturalHeight,
                                  timestamp: new Date().toISOString()
                                }

                                console.error('[ImageGallery Modal] Original image failed to load:', errorDetails)

                                if (target.dataset.errorHandled) return
                                target.dataset.errorHandled = 'true'

                                // Try retry once
                                if (!target.dataset.retryAttempted && originalImage?.url) {
                                  target.dataset.retryAttempted = 'true'
                                  setTimeout(() => {
                                    target.src = originalImage.url + '?retry=' + Date.now()
                                  }, 1000)
                                  return
                                }

                                target.style.display = 'none'

                                const parent = target.parentElement
                                if (parent && !parent.querySelector('.comparison-error-indicator')) {
                                  const errorDiv = document.createElement('div')
                                  errorDiv.className = 'comparison-error-indicator w-full h-full flex items-center justify-center bg-[#1A1A1A] border border-red-500/30 cursor-pointer hover:border-red-500/50 transition-colors'
                                  errorDiv.innerHTML = `
                                    <div class="text-center p-4">
                                      <div class="text-red-400 mb-2">⚠️</div>
                                      <p class="text-xs text-red-400">Original unavailable</p>
                                      <p class="text-xs text-gray-500 mt-1">Click to retry</p>
                                    </div>
                                  `

                                  errorDiv.addEventListener('click', () => {
                                    if (originalImage?.url) {
                                      errorDiv.remove()
                                      target.style.display = 'block'
                                      target.dataset.errorHandled = ''
                                      target.dataset.retryAttempted = ''
                                      target.src = originalImage.url + '?manual_retry=' + Date.now()
                                    }
                                  })

                                  parent.appendChild(errorDiv)
                                }
                              }}
                            />
                            <div className="absolute top-2 left-2 bg-black/80 text-white px-3 py-1.5 rounded-md text-sm font-medium shadow-lg pointer-events-none border border-blue-500/30">
                              Original
                            </div>
                            {/* Click hint overlay */}
                            <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                              <div className="bg-blue-500/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-lg border border-blue-400/30">
                                Click to view full image
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 relative cursor-pointer group min-h-[200px] rounded-lg overflow-hidden bg-[#111111] hover:bg-[#1A1A1A] transition-all duration-200 border-2 border-transparent hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20"
                            onClick={() => {
                              // Create a clean image object for single view
                              const cleanEditedImage: GeneratedImage = {
                                id: selectedImage.id,
                                url: selectedImage.url,
                                prompt: selectedImage.prompt,
                                revisedPrompt: selectedImage.revisedPrompt,
                                timestamp: selectedImage.timestamp,
                                quality: selectedImage.quality,
                                style: selectedImage.style,
                                size: selectedImage.size,
                                model: selectedImage.model,
                                isGenerating: selectedImage.isGenerating,
                                isUploaded: selectedImage.isUploaded,
                                isUpscaled: selectedImage.isUpscaled,
                                upscaleSettings: selectedImage.upscaleSettings,
                                metadata: selectedImage.metadata,
                                geminiUri: selectedImage.geminiUri
                                // Note: originalImageId removed to show as single image view
                              };
                              
                              // Store the comparison state for back navigation
                              setPreviousMultiImage(selectedImage);
                              setIsFromMultiImage(true);
                              
                              // Direct transition to focus modal
                              setSelectedImage(cleanEditedImage);
                            }}
                          >
                            <img
                              src={selectedImage.url}
                              alt="Edited"
                              className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                              onError={(e) => {
                                const target = e.currentTarget
                                const errorEvent = e.nativeEvent as ErrorEvent

                                const errorDetails = {
                                  url: selectedImage.url,
                                  id: selectedImage.id,
                                  context: 'modal-comparison-edited',
                                  errorType: errorEvent?.type || 'unknown',
                                  errorMessage: errorEvent?.message || 'No error message',
                                  targetSrc: target.src,
                                  targetComplete: target.complete,
                                  targetNaturalWidth: target.naturalWidth,
                                  targetNaturalHeight: target.naturalHeight,
                                  timestamp: new Date().toISOString()
                                }

                                console.error('[ImageGallery Modal] Edited image failed to load:', errorDetails)

                                if (target.dataset.errorHandled) return
                                target.dataset.errorHandled = 'true'

                                // Try retry once
                                if (!target.dataset.retryAttempted) {
                                  target.dataset.retryAttempted = 'true'
                                  setTimeout(() => {
                                    target.src = selectedImage.url + '?retry=' + Date.now()
                                  }, 1000)
                                  return
                                }

                                target.style.display = 'none'

                                const parent = target.parentElement
                                if (parent && !parent.querySelector('.comparison-error-indicator')) {
                                  const errorDiv = document.createElement('div')
                                  errorDiv.className = 'comparison-error-indicator w-full h-full flex items-center justify-center bg-[#1A1A1A] border border-red-500/30 cursor-pointer hover:border-red-500/50 transition-colors'
                                  errorDiv.innerHTML = `
                                    <div class="text-center p-4">
                                      <div class="text-red-400 mb-2">⚠️</div>
                                      <p class="text-xs text-red-400">Edited unavailable</p>
                                      <p class="text-xs text-gray-500 mt-1">Click to retry</p>
                                    </div>
                                  `

                                  errorDiv.addEventListener('click', () => {
                                    errorDiv.remove()
                                    target.style.display = 'block'
                                    target.dataset.errorHandled = ''
                                    target.dataset.retryAttempted = ''
                                    target.src = selectedImage.url + '?manual_retry=' + Date.now()
                                  })

                                  parent.appendChild(errorDiv)
                                }
                              }}
                            />
                            <div className="absolute top-2 left-2 bg-black/80 text-white px-3 py-1.5 rounded-md text-sm font-medium shadow-lg pointer-events-none border border-purple-500/30">
                              Edited
                            </div>
                            {/* Click hint overlay */}
                            <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                              <div className="bg-purple-500/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-lg border border-purple-400/30">
                                Click to view full image
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Compare
                            firstImage={selectedImage.url}
                            secondImage={findOriginalImage(selectedImage.originalImageId)?.url}
                            className="w-full h-full max-w-full max-h-full"
                            firstImageClassName="object-contain"
                            secondImageClassname="object-contain"
                            slideMode="drag"
                            showHandlebar={true}
                            autoplay={false}
                          />
                        </div>
                      )}
                    </div>
                </div>
                </>
              ) : (
                // Single image view
                <div className="flex-1 min-h-0 p-2">
                  <div className="h-full bg-[#0A0A0A] rounded-lg flex items-center justify-center p-2">
                    <img
                      src={selectedImage.url}
                      alt={selectedImage.prompt}
                      className={cn(
                        "max-w-full max-h-full object-contain",
                        isFullScreen ? "max-h-[calc(100vh-12rem)]" : "max-h-[calc(85vh-14rem)]"
                      )}
                      onError={(e) => {
                        const target = e.currentTarget
                        const errorEvent = e.nativeEvent as ErrorEvent

                        const errorDetails = {
                          url: selectedImage.url,
                          id: selectedImage.id,
                          context: 'modal-single-view',
                          errorType: errorEvent?.type || 'unknown',
                          errorMessage: errorEvent?.message || 'No error message',
                          targetSrc: target.src,
                          targetComplete: target.complete,
                          targetNaturalWidth: target.naturalWidth,
                          targetNaturalHeight: target.naturalHeight,
                          timestamp: new Date().toISOString()
                        }

                        console.error('[ImageGallery Modal] Image failed to load:', errorDetails)

                        if (target.dataset.errorHandled) return
                        target.dataset.errorHandled = 'true'

                        // Try retry once
                        if (!target.dataset.retryAttempted) {
                          target.dataset.retryAttempted = 'true'
                          setTimeout(() => {
                            target.src = selectedImage.url + '?retry=' + Date.now()
                          }, 1000)
                          return
                        }

                        // Replace with error message
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent && !parent.querySelector('.modal-error-indicator')) {
                          const isReplicateUrl = selectedImage.url?.includes('replicate.delivery') || false
                          const isBlobUrl = selectedImage.url?.includes('blob.vercel-storage.com') || false

                          const errorDiv = document.createElement('div')
                          errorDiv.className = 'modal-error-indicator flex items-center justify-center text-center p-8 cursor-pointer hover:bg-[#2A2A2A] transition-colors rounded-lg'
                          errorDiv.innerHTML = `
                            <div>
                              <div class="text-red-400 text-4xl mb-4">⚠️</div>
                              <p class="text-red-400 font-medium mb-2">Image unavailable</p>
                              <p class="text-gray-500 text-sm mb-2">
                                ${isReplicateUrl ? 'Replicate URL expired (24h limit)' :
                                  isBlobUrl ? 'Blob storage URL may be invalid' :
                                  'The image URL may have expired or be inaccessible'}
                              </p>
                              <p class="text-blue-400 text-sm">Click to retry loading</p>
                            </div>
                          `

                          errorDiv.addEventListener('click', () => {
                            errorDiv.remove()
                            target.style.display = 'block'
                            target.dataset.errorHandled = ''
                            target.dataset.retryAttempted = ''
                            target.src = selectedImage.url + '?manual_retry=' + Date.now()
                          })

                          parent.appendChild(errorDiv)
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Bottom section with prompt and actions - compact */}
              <div className="flex-shrink-0 border-t border-[#333333] p-3 bg-[#1A1A1A] max-h-[40%] overflow-y-auto modal-bottom-section">
                {/* Prompt information - enhanced visibility */}
                <div className="mb-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleCopyPrompt(selectedImage.prompt)}
                          className="h-5 w-5 text-gray-400 hover:text-white hover:bg-white/10 flex-shrink-0 mt-0.5"
                          title="Copy prompt"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <h3
                          className="text-sm font-medium text-white leading-relaxed line-clamp-3 break-words cursor-help hover:text-gray-200 transition-colors flex-1"
                          title={selectedImage.prompt}
                        >
                          {selectedImage.prompt}
                        </h3>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-xs px-2 py-0.5 border flex-shrink-0 mt-0.5", getQualityBadgeColor(selectedImage.quality))}
                    >
                      {selectedImage.quality}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {formatImageTimestamp(selectedImage.timestamp)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {selectedImage.size} • {selectedImage.model}
                    </span>
                  </div>
                </div>
  
                  {/* Action buttons - compact */}
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(selectedImage, { stopPropagation: () => {} } as React.MouseEvent)}
                      className="h-8 text-xs px-3 border-[#333333] hover:bg-[#2B2B2B]"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedImage(null)
                        setEditingImage(selectedImage)
                      }}
                      className="h-8 text-xs px-3 border-[#333333] hover:bg-[#2B2B2B]"
                    >
                      <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </Button>
                    {/* Upscale button */}
                    {!selectedImage.isUpscaled && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedImage(null)
                          setUpscalingImage(selectedImage)
                        }}
                        className="h-8 text-xs px-3 border-[#333333] hover:bg-[#2B2B2B]"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        Upscale
                      </Button>
                    )}
                    {/* Animate button */}
                    {onAnimateImage && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedImage(null)
                          onAnimateImage(selectedImage)
                        }}
                        className="h-8 text-xs px-3 border-[#333333] hover:bg-[#2B2B2B]"
                      >
                        <Video className="w-3.5 h-3.5 mr-1.5" />
                        Animate
                      </Button>
                    )}
                    {/* Delete button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        handleDelete(selectedImage.id, e)
                        // Don't close modal immediately - let user confirm deletion first
                      }}
                      className="h-8 text-xs px-3 border-[#333333] hover:bg-[#2B2B2B] hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Image Edit Modal */}
      {editingImage && (
        <ImageEditModal
          image={editingImage}
          isOpen={!!editingImage}
          onClose={() => setEditingImage(null)}
          onEditComplete={(editedImage) => {
            const updatedImages = [...images, editedImage]
            setImages(updatedImages)
            onImagesChange?.(updatedImages)
            setEditingImage(null)
            onEditComplete?.(editedImage)
          }}
          editingModel={imageEditingModel}
        />
      )}

      {/* Image Upscale Modal */}
      {upscalingImage && (
        <ImageUpscaleModal
          image={upscalingImage}
          isOpen={!!upscalingImage}
          onClose={() => setUpscalingImage(null)}
          onUpscaleComplete={(upscaledImage) => {
            const updatedImages = [...images, upscaledImage]
            setImages(updatedImages)
            onImagesChange?.(updatedImages)
            setUpscalingImage(null)
          }}
        />
      )}

      {/* Multi Image Edit Modal */}
      {showMultiEditModal && (
        <MultiImageEditModal
          images={Array.from(selectedImageIds).map(id => images.find(img => img.id === id)?.url).filter(Boolean) as string[]}
          imageIds={Array.from(selectedImageIds)}
          isOpen={showMultiEditModal}
          onClose={() => {
            setShowMultiEditModal(false)
            setSelectedImageIds(new Set())
            setSelectionMode(false)
          }}
          onEditComplete={(editedImage) => {
            const updatedImages = [...images, editedImage]
            setImages(updatedImages)
            onImagesChange?.(updatedImages)
            setShowMultiEditModal(false)
            setSelectedImageIds(new Set())
            setSelectionMode(false)
          }}
        />
      )}

      {/* Multi Image Compose Modal */}
      {showMultiComposeModal && (
        <MultiImageComposeModal
          images={Array.from(selectedImageIds).map(id => images.find(img => img.id === id)?.url).filter(Boolean) as string[]}
          imageIds={Array.from(selectedImageIds)}
          isOpen={showMultiComposeModal}
          onClose={() => {
            setShowMultiComposeModal(false)
            setSelectedImageIds(new Set())
            setSelectionMode(false)
          }}
          onComposeComplete={(composedImage) => {
            const updatedImages = [...images, composedImage]
            setImages(updatedImages)
            onImagesChange?.(updatedImages)
            setShowMultiComposeModal(false)
            setSelectedImageIds(new Set())
            setSelectionMode(false)
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-[#2B2B2B] border-[#333333] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Delete Image
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this image? This action cannot be undone and the image will be permanently removed from your gallery.
            </AlertDialogDescription>
            {imageToDelete && (
              <div className="mt-3 p-3 bg-[#1A1A1A] rounded-lg border border-[#333333]">
                <div className="text-sm text-gray-300 font-medium mb-1">Image to delete:</div>
                <div className="text-xs text-gray-400 line-clamp-2">
                  {imageToDelete.prompt}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Created {formatImageTimestamp(imageToDelete.timestamp)} • {imageToDelete.quality} quality
                </div>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleCancelDelete}
              className="bg-[#333333] hover:bg-[#4A4A4A] text-white border-[#4A4A4A]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Image
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent className="bg-[#2B2B2B] border-[#333333] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Delete Selected Images
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete these {selectedImagesToDelete.length} images? This action cannot be undone and the images will be permanently removed from your gallery.
            </AlertDialogDescription>
            {selectedImagesToDelete.length > 0 && (
              <div className="mt-3 p-3 bg-[#1A1A1A] rounded-lg border border-[#333333] max-h-48 overflow-y-auto">
                <div className="text-sm text-gray-300 font-medium mb-2">Images to delete:</div>
                <div className="space-y-1">
                  {selectedImagesToDelete.map((image, index) => (
                    <div key={image.id} className="text-xs text-gray-400 line-clamp-1">
                      {index + 1}. {image.prompt}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleCancelBulkDelete}
              className="bg-[#333333] hover:bg-[#4A4A4A] text-white border-[#4A4A4A]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {selectedImagesToDelete.length} Images
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
