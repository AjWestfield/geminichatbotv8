"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { EnhancedTextarea } from "@/components/ui/enhanced-textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Wand2, Merge } from "lucide-react"
import { toast } from "sonner"
import { generateImageId } from "@/lib/image-utils"
import { useImageProgressStore } from "@/lib/stores/image-progress-store"
import type { GeneratedImage } from "@/lib/image-utils"

interface MultiImageComposeModalProps {
  isOpen: boolean
  onClose: () => void
  images: string[] // Array of image URLs
  imageIds?: string[] // Optional array of image IDs for source tracking
  onComposeComplete: (composedImage: GeneratedImage) => void
}

export function MultiImageComposeModal({
  isOpen,
  onClose,
  images,
  imageIds,
  onComposeComplete
}: MultiImageComposeModalProps) {
  const [composePrompt, setComposePrompt] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { addImageGeneration, updateStage, completeImageGeneration, failImageGeneration } = useImageProgressStore()

  // Helper function to convert blob URL to data URL
  const convertBlobToDataUrl = async (blobUrl: string): Promise<string> => {
    try {
      const response = await fetch(blobUrl)
      const blob = await response.blob()

      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('[MultiImageComposeModal] Failed to convert blob URL:', error)
      throw new Error(`Failed to convert blob URL to data URL: ${error}`)
    }
  }

  const handleCompose = async () => {
    if (!images || images.length < 2 || !composePrompt.trim()) return

    // Safety check for maximum images
    if (images.length > 5) {
      toast.error("Too many images selected", {
        description: "Maximum 5 images allowed for scene composition. Please deselect some images.",
        duration: 5000
      })
      return
    }

    console.log('[MultiImageComposeModal] handleCompose called with:', {
      imageCount: images.length,
      hasImageIds: !!imageIds,
      imageIdCount: imageIds?.length || 0,
      prompt: composePrompt
    })

    setIsSubmitting(true)
    setError(null)

    // Generate unique ID for the new image
    const composedImageId = `composed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Add to progress store
    addImageGeneration(composedImageId, composePrompt, {
      quality: "hd",
      style: "vivid",
      size: "1024x1024",
      model: "gpt-image-1"
    })

    try {
      updateStage(composedImageId, 'processing', 'Preparing images...')

      // Convert any blob URLs to data URLs before sending to API
      const processedImages: string[] = []

      for (let i = 0; i < images.length; i++) {
        const imageUrl = images[i]
        console.log(`[MultiImageComposeModal] Processing image ${i + 1}:`, imageUrl.substring(0, 50) + '...')

        if (imageUrl.startsWith('blob:')) {
          console.log(`[MultiImageComposeModal] Converting blob URL to data URL for image ${i + 1}`)
          updateStage(composedImageId, 'processing', `Converting image ${i + 1} to data URL...`)
          const dataUrl = await convertBlobToDataUrl(imageUrl)
          processedImages.push(dataUrl)
        } else {
          processedImages.push(imageUrl)
        }
      }

      updateStage(composedImageId, 'processing', 'Composing scene...')

      const requestBody = {
        images: processedImages,
        prompt: composePrompt,
        model: "gpt-image-1",
        quality: "hd",
        style: "vivid",
        size: "1024x1024"
      }

      console.log('[MultiImageComposeModal] Sending API request')

      const response = await fetch("/api/compose-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to compose images")
      }

      console.log('[MultiImageComposeModal] API response:', data)

      if (!data.success || !data.image) {
        throw new Error("No composed image returned from API")
      }

      updateStage(composedImageId, 'finalizing', 'Processing final image...')

      // Create the composed image object
      const composedImage: GeneratedImage = {
        id: composedImageId,
        prompt: composePrompt,
        url: data.image.url,
        timestamp: new Date(),
        quality: 'hd',
        model: 'gpt-image-1',
        style: 'vivid',
        size: '1024x1024',
        isGenerating: false,
        isMultiImageComposition: true,
        inputImages: images,
        metadata: {
          ...data.metadata,
          sourceImageCount: images.length,
          compositionType: 'scene',
          ...(imageIds && { sourceImageIds: imageIds })
        }
      }

      console.log('[MultiImageComposeModal] Created composed image:', {
        id: composedImage.id,
        url: composedImage.url?.substring(0, 50) + '...',
        model: composedImage.model
      })

      // Complete the generation
      completeImageGeneration(composedImageId, composedImage)
      onComposeComplete(composedImage)

      // Show success message
      toast.success("Scene composition completed!", {
        description: `Combined ${images.length} images into a single scene`,
        duration: 3000
      })

      // Close modal and reset form
      onClose()
      setComposePrompt("")

    } catch (error: any) {
      console.error("Multi-image composition error:", error)
      setError(error.message)

      failImageGeneration(
        composedImageId,
        error.message || "Failed to compose images"
      )

      toast.error("Scene composition failed", {
        description: error.message || "An error occurred while composing the images",
        duration: 5000
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
      setComposePrompt("")
      setError(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl bg-[#2B2B2B] border-[#333333]">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Merge className="w-5 h-5" />
            Multi-Image Scene Composer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Important Notice */}
          <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3 text-sm text-green-400">
            <p className="font-medium mb-1">✨ How this works:</p>
            <p>This tool <strong>merges subjects</strong> from multiple images into a single scene. 
            Perfect for creating composite images like people dining together, group photos, or combined scenes.</p>
          </div>

          {/* Image Preview Grid */}
          <div className="space-y-2">
            <Label className="text-white text-sm font-medium">
              Selected Images ({images.length}/5 max)
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-h-48 overflow-y-auto p-2 bg-[#1A1A1A] rounded-lg">
              {images.map((imageUrl, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-[#333333]">
                  <img
                    src={imageUrl}
                    alt={`Image ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      console.error(`[MultiImageComposeModal] Image ${index + 1} failed to load:`, imageUrl)
                      const target = e.currentTarget
                      target.style.display = 'none'

                      // Show error indicator
                      const parent = target.parentElement
                      if (parent && !parent.querySelector('.broken-image-indicator')) {
                        const errorDiv = document.createElement('div')
                        errorDiv.className = 'broken-image-indicator w-full h-full bg-red-900/20 flex items-center justify-center border border-red-500/30'
                        errorDiv.innerHTML = `
                          <div class="text-center">
                            <div class="text-red-400 text-xs">⚠️</div>
                            <div class="text-red-400 text-xs">Failed</div>
                          </div>
                        `
                        parent.appendChild(errorDiv)
                      }
                    }}
                  />
                  <div className="absolute top-1 left-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Compose Prompt */}
          <div className="space-y-2">
            <Label htmlFor="compose-prompt" className="text-white text-sm font-medium">
              Scene Description
            </Label>

            <EnhancedTextarea
              id="compose-prompt"
              placeholder={
                images.length === 2
                  ? "Describe the scene you want to create... (e.g., 'A man and woman dining together at a romantic restaurant')"
                  : "Describe how to combine these images... (e.g., 'All people sitting together at a dinner table')"
              }
              value={composePrompt}
              onChange={(e) => setComposePrompt(e.target.value)}
              context="compose"
              disabled={isSubmitting}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#333333]">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="bg-transparent border-[#333333] text-white hover:bg-[#333333]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompose}
              disabled={isSubmitting || !composePrompt.trim() || images.length < 2}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Composing...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Compose Scene
                </>
              )}
            </Button>
          </div>

          {/* Info */}
          <div className="text-xs text-gray-400 bg-[#1A1A1A] p-3 rounded-lg">
            <p className="font-medium mb-1">Scene Composition with GPT-Image-1:</p>
            <ul className="space-y-1 ml-2">
              <li>• Merges subjects from {images.length} images into a single scene</li>
              <li>• Perfect for creating group photos or combined scenes</li>
              <li>• Intelligently arranges subjects based on your description</li>
              <li>• High quality output with natural lighting and shadows</li>
              <li>• Processing time: ~20-30 seconds</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}